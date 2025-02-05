from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

from database import get_db
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError

from models import Workflow, WorkflowStep, WorkflowVariable, Tool, PromptTemplate
from schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowStepCreate,
    WorkflowVariableCreate, WorkflowExecuteRequest,
    WorkflowResponse, WorkflowStepResponse, WorkflowVariableResponse,
    ToolResponse, ToolSignature, ParameterSchema, OutputSchema, SchemaValue
)
from exceptions import (
    WorkflowNotFoundError, InvalidWorkflowError, WorkflowExecutionError,
    StepNotFoundError, ToolNotFoundError, VariableValidationError,
    InvalidStepConfigurationError
)

class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def create_workflow(self, workflow_data: WorkflowCreate, user_id: int) -> Workflow:
        """Create a new workflow."""
        try:
            workflow = Workflow(
                workflow_id=str(uuid4()),
                user_id=user_id,
                name=workflow_data.name,
                description=workflow_data.description,
                status="draft",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(workflow)
            self.db.commit()
            self.db.refresh(workflow)
            return workflow
        except SQLAlchemyError as e:
            self.db.rollback()
            raise WorkflowExecutionError(str(e), "new")

    def get_workflow(self, workflow_id: str, user_id: int) -> WorkflowResponse:
        """Get a workflow by ID."""
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        if not workflow:
            print(f"Workflow {workflow_id} not found for user {user_id}")
            raise WorkflowNotFoundError(workflow_id)
        print(f"Workflow {workflow_id} found for user {user_id}")

        # Fetch workflow variables
        workflow_variables = self.db.query(WorkflowVariable).filter(WorkflowVariable.workflow_id == workflow_id).all()
        
        # Split into inputs and outputs
        print("Getting inputs")
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
        print(f"Input count: {len(inputs)}")

        print("Getting outputs")
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
        print(f"Output count: {len(outputs)}")

        # Fetch workflow steps
        steps = self.db.query(WorkflowStep).filter(
            WorkflowStep.workflow_id == workflow_id
        ).all()
        print(f"Step count: {len(steps)}")

        step_data = []
        for step in steps:
            print(f"Processing step {step.step_id}")
            
            # Explicitly retrieve the tool with its complete data
            tool = None
            if step.tool_id:
                tool = self.db.query(Tool).filter(Tool.tool_id == step.tool_id).first()
                if tool:
                    print(f"Found tool: {tool.tool_id}")
                    print(f"Tool type: {tool.tool_type}")
                    
                    # For LLM tools, derive signature from prompt template
                    if tool.tool_type == 'llm' and step.prompt_template:
                        tool.signature = self._get_llm_signature(step.prompt_template)
                        print(f"Derived LLM signature: {tool.signature}")
                    else:
                        print(f"Tool signature type: {type(tool.signature)}")
                        print(f"Tool signature content: {tool.signature}")
                else:
                    print(f"No tool found for tool_id: {step.tool_id}")

            def create_schema_value(schema_dict: Dict) -> SchemaValue:
                """Helper function to create a SchemaValue object from a dictionary."""
                schema_copy = schema_dict.copy()
                if 'items' in schema_copy:
                    schema_copy['items'] = create_schema_value(schema_copy['items'])
                if 'fields' in schema_copy:
                    schema_copy['fields'] = {
                        k: create_schema_value(v) for k, v in schema_copy['fields'].items()
                    }
                return SchemaValue(**schema_copy)

            tool_response = None
            if tool and tool.signature:
                try:
                    tool_response = ToolResponse(
                        tool_id=tool.tool_id,
                        name=tool.name,
                        description=tool.description,
                        tool_type=tool.tool_type,
                        signature=ToolSignature(
                            parameters=[
                                ParameterSchema(
                                    name=param['name'],
                                    description=param.get('description', ''),
                                    schema=create_schema_value(param['schema'])
                                )
                                for param in tool.signature.get('parameters', [])
                            ],
                            outputs=[
                                OutputSchema(
                                    name=output['name'],
                                    description=output.get('description', ''),
                                    schema=create_schema_value(output['schema'])
                                )
                                for output in tool.signature.get('outputs', [])
                            ]
                        ),
                        created_at=tool.created_at,
                        updated_at=tool.updated_at
                    )
                except Exception as e:
                    print(f"Error creating tool response: {str(e)}")
                    print(f"Tool data: {tool.__dict__}")

            step_response = WorkflowStepResponse(
                step_id=step.step_id,
                workflow_id=workflow_id,
                label=step.label,
                description=step.description,
                step_type=step.step_type,
                tool_id=step.tool_id,
                prompt_template=step.prompt_template,
                parameter_mappings=step.parameter_mappings,
                output_mappings=step.output_mappings,
                created_at=step.created_at,
                updated_at=step.updated_at,
                tool=tool_response
            )
            step_data.append(step_response)

        # Construct response

        return WorkflowResponse(
            workflow_id=workflow.workflow_id,
            user_id=workflow.user_id,
            name=workflow.name,
            description=workflow.description,
            status=workflow.status,
            error=workflow.error,
            inputs=inputs,
            outputs=outputs,
            steps=step_data,
            created_at=workflow.created_at,
            updated_at=workflow.updated_at
        )

    def get_workflows(self, user_id: int) -> List[Workflow]:
        """List all workflows for a user."""
        print(f"Getting workflows for user {user_id}")
        return self.db.query(Workflow).filter(Workflow.user_id == user_id).all()

    def update_workflow(self, workflow_id: str, workflow_data: WorkflowUpdate, user_id: int) -> WorkflowResponse:
        """Update a workflow."""
        print(f"Updating workflow {workflow_id} for user {user_id}")
        workflow = self.get_workflow(workflow_id, user_id)
        
        try:
            # Convert Pydantic model to dict
            update_data = workflow_data.model_dump(exclude_unset=True)
                                       
            # Update basic workflow properties
            basic_props = {k: v for k, v in update_data.items() 
                         if k not in ['steps', 'inputs', 'outputs']}
            for key, value in basic_props.items():
                setattr(workflow, key, value)
            
            # Update steps if provided
            print(f"Updating steps")
            if 'steps' in update_data:
                # Delete existing steps
                self.db.query(WorkflowStep).filter(
                    WorkflowStep.workflow_id == workflow_id
                ).delete()
                
                # Create new steps
                for step_data in update_data['steps']:
                    # Handle both Pydantic models and dicts
                    if hasattr(step_data, 'model_dump'):
                        step_dict = step_data.model_dump()
                    else:
                        step_dict = step_data
                    # print(f"Step data before processing: {step_dict}")
                    
                    # Extract tool_id from nested tool object if it exists
                    if 'tool' in step_dict and step_dict['tool']:
                        step_dict['tool_id'] = step_dict['tool']['tool_id']
                    step_dict.pop('tool', None)  # Remove the tool object as it's not in the model
                    
                    # Ensure mappings are properly handled
                    parameter_mappings = step_dict.get('parameter_mappings')
                    output_mappings = step_dict.get('output_mappings')
                    
                    # Convert None to empty dict if necessary
                    if parameter_mappings is None:
                        parameter_mappings = {}
                    if output_mappings is None:
                        output_mappings = {}
                        
                    # Ensure mappings are dictionaries
                    if not isinstance(parameter_mappings, dict):
                        parameter_mappings = dict(parameter_mappings)
                    if not isinstance(output_mappings, dict):
                        output_mappings = dict(output_mappings)
                    
                    step_dict['parameter_mappings'] = parameter_mappings
                    step_dict['output_mappings'] = output_mappings
                    
                    #print(f"Creating step with data: {step_dict}")
                    #print(f"Parameter mappings: {step_dict['parameter_mappings']}")
                    #print(f"Output mappings: {step_dict['output_mappings']}")
                    
                    step = WorkflowStep(
                        workflow_id=workflow_id,
                        step_id=str(uuid4()),  # Ensure each step has a unique ID
                        **step_dict
                    )
                    self.db.add(step)
                    print(f"Added step to session: {step.__dict__}")
            
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
                        var_dict = var_data.model_dump()
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
                        var_dict = var_data.model_dump()
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
        workflow = self.get_workflow(workflow_id, user_id)
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
        
        # Validate step connections
        step_ids = {step.step_id for step in workflow.steps}
        for step in workflow.steps:
            if step.next_step_id and step.next_step_id not in step_ids:
                raise InvalidWorkflowError(
                    f"Step {step.step_id} references non-existent next step {step.next_step_id}"
                )
        
        # Validate no cycles
        visited = set()
        def check_cycle(step_id: str, path: set) -> None:
            if step_id in path:
                raise InvalidWorkflowError(f"Cycle detected in workflow at step {step_id}")
            if step_id in visited or step_id not in step_ids:
                return
            
            visited.add(step_id)
            path.add(step_id)
            
            step = next(s for s in workflow.steps if s.step_id == step_id)
            if step.next_step_id:
                check_cycle(step.next_step_id, path)
            
            path.remove(step_id)
        
        for step in workflow.steps:
            if step.step_id not in visited:
                check_cycle(step.step_id, set())
        
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

    async def execute_workflow(self, workflow_id: str, execution_data: WorkflowExecuteRequest, user_id: int) -> Dict[str, Any]:
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
            
            # Execute steps in sequence
            current_step = next((s for s in workflow.steps if not any(
                other.next_step_id == s.step_id for other in workflow.steps
            )), None)
            
            while current_step:
                # Execute step
                step_result = await self._execute_step(current_step, context)
                context["step_outputs"][current_step.step_id] = step_result
                
                # Update context with step outputs
                if current_step.output_mappings:
                    for output_name, var_name in current_step.output_mappings.items():
                        if output_name in step_result:
                            context["output"][var_name] = step_result[output_name]
                
                # Move to next step
                current_step = next(
                    (s for s in workflow.steps if s.step_id == current_step.next_step_id),
                    None
                )
            
            # Update workflow status
            workflow.status = "completed"
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            
            return {
                "status": "success",
                "output": context["output"]
            }
            
        except Exception as e:
            workflow.status = "failed"
            workflow.error = str(e)
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            raise WorkflowExecutionError(str(e), workflow_id)

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
        
        # Convert prompt tokens to parameters
        parameters = [
            {
                'name': token,
                'description': f'Value for {{{{{token}}}}} in the prompt',
                'schema': {
                    'name': token,
                    'type': 'string'
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
