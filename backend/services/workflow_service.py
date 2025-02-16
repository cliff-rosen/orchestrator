from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from database import get_db
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError

from models import Workflow, WorkflowStep, WorkflowVariable, Tool, PromptTemplate, File
from schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowStepCreate,
    WorkflowVariableCreate, WorkflowExecuteRequest,
    WorkflowResponse, WorkflowStepResponse, WorkflowVariableResponse,
    ToolResponse, ToolSignature, ParameterSchema, OutputSchema, SchemaValue,
    WorkflowExecuteResponse, Variable, VariableType
)
from exceptions import (
    WorkflowNotFoundError, InvalidWorkflowError, WorkflowExecutionError,
    StepNotFoundError, ToolNotFoundError, VariableValidationError,
    InvalidStepConfigurationError
)

class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def create_workflow(self, workflow_data: WorkflowCreate, user_id: str) -> Workflow:
        """Create a new workflow with associated steps and variables."""
        # Create the main workflow record
        workflow = Workflow(
            workflow_id=str(uuid4()),
            user_id=user_id,
            name=workflow_data.name,
            description=workflow_data.description,
            status=workflow_data.status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(workflow)
        self.db.flush()  # Flush to get the workflow_id

        # Create steps if provided
        if workflow_data.steps:
            for step_data in workflow_data.steps:
                step = WorkflowStep(
                    step_id=str(uuid4()),
                    workflow_id=workflow.workflow_id,
                    label=step_data.label,
                    description=step_data.description,
                    step_type=step_data.step_type,
                    tool_id=step_data.tool_id,
                    prompt_template=step_data.prompt_template,
                    parameter_mappings=step_data.parameter_mappings or {},
                    output_mappings=step_data.output_mappings or {},
                    sequence_number=step_data.sequence_number,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(step)

        # Create input variables if provided
        if workflow_data.inputs:
            for input_data in workflow_data.inputs:
                input_var = WorkflowVariable(
                    variable_id=input_data.variable_id or str(uuid4()),
                    workflow_id=workflow.workflow_id,
                    name=input_data.name,
                    description=input_data.description,
                    schema=input_data.schema,
                    variable_type='input',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(input_var)

        # Create output variables if provided
        if workflow_data.outputs:
            for output_data in workflow_data.outputs:
                output_var = WorkflowVariable(
                    variable_id=output_data.variable_id or str(uuid4()),
                    workflow_id=workflow.workflow_id,
                    name=output_data.name,
                    description=output_data.description,
                    schema=output_data.schema,
                    variable_type='output',
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(output_var)

        try:
            self.db.commit()
            self.db.refresh(workflow)
            
            # Return the complete workflow with relationships loaded
            return self.get_workflow(workflow.workflow_id, user_id)
        except Exception as e:
            self.db.rollback()
            raise e

    def get_workflow(self, workflow_id: str, user_id: int) -> WorkflowResponse:
        """Get a workflow by ID."""
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        
        if not workflow:
            raise WorkflowNotFoundError(workflow_id)
        
        try:
            # Fetch workflow variables
            workflow_variables = self.db.query(WorkflowVariable).filter(
                WorkflowVariable.workflow_id == workflow_id
            ).all()
            
            # Split into inputs and outputs
            inputs = [
                WorkflowVariableResponse(
                    variable_id=var.variable_id,
                    workflow_id=workflow_id,
                    name=var.name,
                    description=var.description,
                    schema=var.schema,
                    created_at=var.created_at,
                    updated_at=var.updated_at
                )
                for var in workflow_variables if var.variable_type == "input"
            ]
            
            outputs = [
                WorkflowVariableResponse(
                    variable_id=var.variable_id,
                    workflow_id=workflow_id,
                    name=var.name,
                    description=var.description,
                    schema=var.schema,
                    created_at=var.created_at,
                    updated_at=var.updated_at
                )
                for var in workflow_variables if var.variable_type == "output"
            ]

            # Process steps and their tools
            steps = []
            for s in workflow.steps:
                tool_response = None
                if s.tool_id:
                    tool = self.db.query(Tool).filter(Tool.tool_id == s.tool_id).first()
                    if tool:
                        # For LLM tools, get signature from prompt template if specified
                        if tool.tool_type == 'llm' and s.prompt_template:
                            llm_signature = self._get_llm_signature(s.prompt_template)
                            tool_response = ToolResponse(
                                tool_id=tool.tool_id,
                                name=tool.name,
                                description=tool.description,
                                tool_type=tool.tool_type,
                                signature=ToolSignature(
                                    parameters=llm_signature['parameters'],
                                    outputs=llm_signature['outputs']
                                ),
                                created_at=tool.created_at,
                                updated_at=tool.updated_at
                            )
                        else:
                            # For non-LLM tools, use the tool's signature directly
                            tool_response = ToolResponse(
                                tool_id=tool.tool_id,
                                name=tool.name,
                                description=tool.description,
                                tool_type=tool.tool_type,
                                signature=tool.signature,
                                created_at=tool.created_at,
                                updated_at=tool.updated_at
                            )

                steps.append(WorkflowStepResponse(
                    step_id=s.step_id,
                    workflow_id=s.workflow_id,
                    label=s.label,
                    description=s.description,
                    step_type=s.step_type,
                    tool_id=s.tool_id,
                    prompt_template=s.prompt_template,
                    parameter_mappings=s.parameter_mappings,
                    output_mappings=s.output_mappings,
                    sequence_number=s.sequence_number,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                    tool=tool_response
                ))

            # Convert to WorkflowResponse
            return WorkflowResponse(
                workflow_id=workflow.workflow_id,
                user_id=workflow.user_id,
                name=workflow.name,
                description=workflow.description,
                status=workflow.status,
                error=workflow.error,
                steps=steps,  # Now includes properly populated tool information
                inputs=inputs,
                outputs=outputs,
                created_at=workflow.created_at,
                updated_at=workflow.updated_at
            )
        except Exception as e:
            print(f"Error converting workflow to response: {str(e)}")
            raise

    def get_workflows(self, user_id: int) -> List[Workflow]:
        """List all workflows for a user."""
        print(f"Getting workflows for user {user_id}")
        workflows = self.db.query(Workflow).filter(Workflow.user_id == user_id).all()
        
        # For each workflow, fetch its steps with proper sequence ordering
        for workflow in workflows:
            workflow.steps = (
                self.db.query(WorkflowStep)
                .filter(WorkflowStep.workflow_id == workflow.workflow_id)
                .order_by(WorkflowStep.sequence_number)
                .all()
            )
        
        return workflows

    def update_workflow(self, workflow_id: str, workflow_data: WorkflowUpdate, user_id: int) -> WorkflowResponse:
        """Update a workflow."""

        print(f"Retrieving workflow {workflow_id} for user {user_id}")
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        if not workflow:
            raise WorkflowNotFoundError(workflow_id)
        
        try:
            # Convert Pydantic model to dict
            update_data = workflow_data.model_dump(exclude_unset=True)
                                       
            # Update basic workflow properties
            basic_props = {k: v for k, v in update_data.items() 
                         if k not in ['steps', 'inputs', 'outputs']}
            for key, value in basic_props.items():
                setattr(workflow, key, value)
            
            # Update steps if provided
            print(f"Updating workflow steps")
            if 'steps' in update_data:
                # Delete existing steps
                print(f"Deleting existing steps")
                self.db.query(WorkflowStep).filter(
                    WorkflowStep.workflow_id == workflow_id
                ).delete()
                
                # Create new steps with sequence numbers
                print(f"Creating new steps")
                for idx, step_data in enumerate(update_data['steps']):
                    if hasattr(step_data, 'model_dump'):
                        step_dict = step_data.model_dump()
                    else:
                        step_dict = step_data
                    
                    # Add sequence number
                    step_dict['sequence_number'] = idx
                    
                    # Generate UUID if needed
                    if not step_dict.get('step_id') or step_dict['step_id'].startswith('step-'):
                        step_dict['step_id'] = str(uuid4())
                    
                    # Extract tool_id from nested tool object if it exists
                    print("Checking for tool in step_dict")
                    if 'tool' in step_dict and step_dict['tool']:
                        print(f"Tool found in step_dict: {step_dict['tool']}")
                        step_dict['tool_id'] = step_dict['tool']['tool_id']
                    step_dict.pop('tool', None)  # Remove the tool object as it's not in the model
                    
                    # Create the step
                    step = WorkflowStep(
                        workflow_id=workflow_id,
                        **step_dict
                    )
                    self.db.add(step)
            
            # Update variables if provided
            print(f"Updating variables")
            if 'inputs' in update_data or 'outputs' in update_data:
                # Delete existing variables
                self.db.query(WorkflowVariable).filter(
                    WorkflowVariable.workflow_id == workflow_id
                ).delete()
                
                # Create new input variables
                if 'inputs' in update_data:
                    for var_data in update_data['inputs']:
                        # Handle both Pydantic models and dicts
                        var_dict = var_data.model_dump() if hasattr(var_data, 'model_dump') else var_data
                        var = WorkflowVariable(
                            variable_id=str(uuid4()),
                            workflow_id=workflow_id,
                            variable_type='input',
                            name=var_dict['name'],
                            description=var_dict.get('description'),
                            schema=var_dict['schema']
                        )
                        self.db.add(var)
                
                # Create new output variables
                if 'outputs' in update_data:
                    for var_data in update_data['outputs']:
                        # Handle both Pydantic models and dicts
                        var_dict = var_data.model_dump() if hasattr(var_data, 'model_dump') else var_data
                        var = WorkflowVariable(
                            variable_id=str(uuid4()),
                            workflow_id=workflow_id,
                            variable_type='output',
                            name=var_dict['name'],
                            description=var_dict.get('description'),
                            schema=var_dict['schema']
                        )
                        self.db.add(var)
            
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(workflow)
            
            # Return the updated workflow using get_workflow to ensure proper response format
            print(f"Returning updated workflow: {self.get_workflow(workflow_id, user_id)}")
            return self.get_workflow(workflow_id, user_id)
            
        except SQLAlchemyError as e:
            print(f"Error updating workflow: {str(e)}")
            self.db.rollback()
            raise WorkflowExecutionError(str(e), workflow_id)

    def delete_workflow(self, workflow_id: str, user_id: int) -> None:
        """Delete a workflow."""
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        
        if not workflow:
            raise WorkflowNotFoundError(workflow_id)
        
        try:
            self.db.delete(workflow)
            self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise WorkflowExecutionError(str(e), workflow_id)

    def add_step(self, workflow_id: str, step_data: WorkflowStepCreate, user_id: int) -> WorkflowStep:
        """Add a step to a workflow."""
        workflow = self.get_workflow(workflow_id, user_id)
        
        if step_data.tool_id:
            tool = self.db.query(Tool).filter(Tool.tool_id == step_data.tool_id).first()
            if not tool:
                raise ToolNotFoundError(step_data.tool_id)
        
        step = WorkflowStep(
            step_id=str(uuid4()),
            workflow_id=workflow_id,
            **step_data.dict()
        )
        
        try:
            self.db.add(step)
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(step)
            return step
        except SQLAlchemyError as e:
            self.db.rollback()
            raise WorkflowExecutionError(str(e), workflow_id)

    def validate_workflow(self, workflow: Workflow) -> bool:
        """
        Validate a workflow's structure and connections.
        Returns True if valid, raises InvalidWorkflowError if not.
        """
        if not workflow.steps:
            raise InvalidWorkflowError("Workflow must have at least one step")
        
        # Validate sequence numbers
        sequence_numbers = [step.sequence_number for step in workflow.steps]
        if len(set(sequence_numbers)) != len(sequence_numbers):
            raise InvalidWorkflowError("Duplicate sequence numbers found in workflow steps")
        
        if min(sequence_numbers) != 0:
            raise InvalidWorkflowError("Sequence numbers must start at 0")
        
        if max(sequence_numbers) != len(workflow.steps) - 1:
            raise InvalidWorkflowError("Sequence numbers must be consecutive")
        
        return True

    def validate_input_data(self, workflow: Workflow, input_data: Dict[str, Any]) -> None:
        """Validate input data against workflow input variables."""
        input_vars = {var.name: var for var in workflow.variables if var.variable_type == 'input'}
        
        # Check required inputs are provided
        for var_name, var in input_vars.items():
            if var_name not in input_data:
                raise VariableValidationError(var_name, "Required input not provided")
            
            # TODO: Validate input data against variable schema
            # This would involve checking types, ranges, patterns, etc.
            # based on the JSON Schema in var.schema

    async def execute_workflow(self, workflow_id: str, execution_data: WorkflowExecuteRequest, user_id: int) -> WorkflowExecuteResponse:
        """Execute a workflow with given input data."""
        workflow = self.get_workflow(workflow_id, user_id)
        
        # Validate workflow structure
        self.validate_workflow(workflow)
        
        # Validate input data
        self.validate_input_data(workflow, execution_data.input_data)
        
        # Update workflow status
        workflow.status = "running"
        workflow.updated_at = datetime.utcnow()
        self.db.commit()
        
        try:
            # Initialize execution context
            context = {
                "input": execution_data.input_data,
                "output": {},
                "step_outputs": {}
            }
            
            # Get steps ordered by sequence number
            steps = self.db.query(WorkflowStep).filter(
                WorkflowStep.workflow_id == workflow_id
            ).order_by(WorkflowStep.sequence_number).all()
            
            # Execute steps in sequence
            for step in steps:
                # Execute step
                step_result = await self._execute_step(step, context)
                context["step_outputs"][step.step_id] = step_result
                
                # Update context with step outputs
                if step.output_mappings:
                    for output_name, var_name in step.output_mappings.items():
                        if output_name in step_result:
                            context["output"][var_name] = step_result[output_name]
            
            # Update workflow status
            workflow.status = "completed"
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            
            return WorkflowExecuteResponse(
                workflow_id=workflow_id,
                status="completed",
                output=context["output"],
                execution_time=0.0  # Calculate actual execution time
            )
            
        except Exception as e:
            workflow.status = "failed"
            workflow.error = str(e)
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            return WorkflowExecuteResponse(
                workflow_id=workflow_id,
                status="failed",
                output={},
                error=str(e),
                execution_time=0.0
            )

    async def _execute_step(self, step: WorkflowStep, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single workflow step."""
        if step.step_type == "ACTION" and step.tool_id:
            tool = self.db.query(Tool).filter(Tool.tool_id == step.tool_id).first()
            if not tool:
                raise ToolNotFoundError(step.tool_id)
            
            # Validate parameters against tool signature
            tool_params = {param.name: param for param in tool.signature.parameters}
            for param_name, param_mapping in step.parameter_mappings.items():
                if param_name not in tool_params:
                    raise InvalidStepConfigurationError(
                        f"Parameter '{param_name}' not found in tool signature"
                    )
            
            # Check required parameters
            for param in tool.signature.parameters:
                if param.required and param.name not in step.parameter_mappings:
                    raise InvalidStepConfigurationError(
                        f"Required parameter '{param.name}' not provided"
                    )
            
            # Prepare tool parameters
            parameters = {}
            for param_name, param_mapping in step.parameter_mappings.items():
                param_spec = tool_params[param_name]
                if param_mapping.startswith("input."):
                    _, input_name = param_mapping.split(".", 1)
                    value = context["input"].get(input_name)
                elif param_mapping.startswith("step."):
                    _, step_id, output_name = param_mapping.split(".", 2)
                    value = context["step_outputs"].get(step_id, {}).get(output_name)
                else:
                    value = param_mapping  # Direct value
                
                # TODO: Validate value against parameter type
                parameters[param_name] = value
            
            # TODO: Execute tool with parameters
            # This would involve:
            # 1. Tool-specific execution logic
            # 2. Error handling
            # 3. Result validation against output signature
            mock_result = {
                output.name: f"Mock {output.name} for tool {tool.name}"
                for output in tool.signature.outputs
            }
            return mock_result
            
        elif step.step_type == "INPUT":
            # Input steps just pass through their mapped inputs
            return {
                output_name: context["input"].get(input_name)
                for output_name, input_name in step.output_mappings.items()
            }
        
        else:
            raise InvalidStepConfigurationError(f"Unknown step type: {step.step_type}")

    def _get_llm_signature(self, prompt_template_id: str) -> Dict:
        """Get the signature for an LLM tool based on its prompt template."""
        prompt_template = self.db.query(PromptTemplate).filter(
            PromptTemplate.template_id == prompt_template_id
        ).first()
        
        if not prompt_template:
            print(f"No prompt template found for id: {prompt_template_id}")
            return {'parameters': [], 'outputs': []}
            
        print(f"Found prompt template: {prompt_template.template_id}")
        
        # Convert tokens to parameters based on their type
        parameters = [
            {
                'name': token['name'],
                'description': f"Value for {{{{{token['name']}}}}} in the prompt" if token['type'] == 'string' 
                             else f"File content for <<file:{token['name']}>> in the prompt",
                'schema': {
                    'name': token['name'],
                    'type': 'string' if token['type'] == 'string' else 'file'
                }
            }
            for token in prompt_template.tokens
        ]
        
        # Convert output schema to outputs
        if prompt_template.output_schema['type'] == 'object' and 'schema' in prompt_template.output_schema:
            outputs = [
                {
                    'name': key,
                    'description': field.get('description', ''),
                    'schema': {
                        'name': key,
                        'type': field['type']
                    }
                }
                for key, field in prompt_template.output_schema['schema']['fields'].items()
            ]
        else:
            outputs = [{
                'name': 'response',
                'description': prompt_template.output_schema.get('description', ''),
                'schema': {
                    'name': 'response',
                    'type': prompt_template.output_schema['type']
                }
            }]
        
        return {
            'parameters': parameters,
            'outputs': outputs
        }

    def validate_variable_mapping(self, template_variable: Variable, workflow_variable: WorkflowVariable) -> bool:
        """
        Validate that a workflow variable can be mapped to a template variable
        """
        # Types must match exactly
        if template_variable.type != workflow_variable.type:
            return False
        
        # For file variables, check format and content type compatibility
        if template_variable.type == VariableType.FILE:
            template_schema = template_variable.schema
            workflow_schema = workflow_variable.schema
            
            # If template specifies a format, workflow must match
            if template_schema.format and template_schema.format != workflow_schema.format:
                return False
            
            # If template specifies content types, workflow must have compatible ones
            if template_schema.content_types:
                if not workflow_schema.content_types:
                    return False
                if not any(ct in template_schema.content_types for ct in workflow_schema.content_types):
                    return False
                
        return True

    def validate_step_configuration(self, step: WorkflowStep, template: PromptTemplate) -> List[str]:
        """
        Validate a workflow step configuration against a prompt template
        Returns a list of validation errors, empty if valid
        """
        errors = []
        
        # Check all required tokens are mapped
        for token in template.tokens:
            token_name = token['name']
            if token_name not in step.parameter_mappings:
                errors.append(f"Required token '{token_name}' not mapped")
                continue
                
            # Get the workflow variable this token is mapped to
            var_name = step.parameter_mappings[token_name]
            workflow_var = self.db.query(WorkflowVariable).filter(
                WorkflowVariable.workflow_id == step.workflow_id,
                WorkflowVariable.name == var_name
            ).first()
            
            if not workflow_var:
                errors.append(f"Token '{token_name}' mapped to non-existent variable '{var_name}'")
                continue
            
            # Validate type compatibility
            if token['type'] == 'file' and workflow_var.schema['type'] != 'file':
                errors.append(f"File token '{token_name}' mapped to non-file variable '{var_name}'")
            elif token['type'] == 'string' and workflow_var.schema['type'] not in ['string', 'number', 'boolean']:
                errors.append(f"String token '{token_name}' mapped to incompatible variable type '{workflow_var.schema['type']}'")
                
        return errors

    async def execute_workflow_step(self, step: WorkflowStep, variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single workflow step
        """
        if not step.prompt_template:
            raise InvalidStepConfigurationError("No prompt template specified for LLM step")
            
        template = self.db.query(PromptTemplate).filter(
            PromptTemplate.template_id == step.prompt_template
        ).first()
        
        if not template:
            raise InvalidStepConfigurationError(f"Prompt template {step.prompt_template} not found")
        
        # Validate step configuration
        errors = self.validate_step_configuration(step, template)
        if errors:
            raise InvalidStepConfigurationError(f"Invalid step configuration: {', '.join(errors)}")
        
        # Build parameters for template execution
        regular_variables = {}
        file_variables = {}
        
        for token in template.tokens:
            token_name = token['name']
            if token_name not in step.parameter_mappings:
                continue  # Should not happen due to validation
                
            var_name = step.parameter_mappings[token_name]
            if var_name not in variables:
                raise WorkflowExecutionError(f"Missing variable value for '{var_name}'")
                
            if token['type'] == 'file':
                file_variables[token_name] = variables[var_name]
            else:
                regular_variables[token_name] = variables[var_name]
            
        # Execute template
        from services import ai_service
        result = await ai_service.execute_llm(
            prompt_template_id=template.template_id,
            regular_variables=regular_variables,
            file_variables=file_variables
        )
        
        return result 
