from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from uuid import uuid4
import random

from database import get_db
from models import Tool, PromptTemplate, WorkflowStep
from schemas import (
    ToolResponse, PromptTemplateResponse, LLMExecuteRequest, LLMExecuteResponse,
    PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest
)
from services import ai_service

router = APIRouter(
    prefix="/api",
    tags=["tools"]
)

@router.get("/tools", response_model=List[ToolResponse])
def get_tools(db: Session = Depends(get_db)):
    """Get all available tools"""
    return db.query(Tool).all()

@router.get("/tools/{tool_id}", response_model=ToolResponse)
def get_tool(tool_id: str, db: Session = Depends(get_db)):
    """Get a specific tool by ID"""
    tool = db.query(Tool).filter(Tool.tool_id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@router.get("/prompt-templates", response_model=List[PromptTemplateResponse])
def get_prompt_templates(db: Session = Depends(get_db)):
    """Get all available prompt templates"""
    return db.query(PromptTemplate).all()

@router.get("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
def get_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """Get a specific prompt template by ID"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return template

@router.post("/llm/execute", response_model=LLMExecuteResponse)
async def execute_llm(
    request: LLMExecuteRequest,
    db: Session = Depends(get_db)
):
    """Execute an LLM request with a prompt template"""
    try:
        # Get the prompt template
        template = db.query(PromptTemplate).filter(PromptTemplate.template_id == request.prompt_template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Prompt template not found")

        # If provider specified, set it
        if request.provider:
            ai_service.set_provider(request.provider)

        # Format the prompt using the template and parameters
        template_text = template.template
        prompt = template_text
        for token in template.tokens:
            if token not in request.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required parameter: {token}"
                )
            # Handle array values for tokens by joining them with a delimiter
            token_value = request.parameters[token]
            if isinstance(token_value, list):
                token_value = " | ".join(str(v) for v in token_value)
            prompt = prompt.replace(f"{{{{{token}}}}}", str(token_value))

        # Execute the LLM request
        llm_response = await ai_service.provider.generate(
            prompt=prompt,
            model=request.model,
            max_tokens=request.max_tokens
        )

        # Process response based on schema type
        response = llm_response  # Default to raw text response
        if template.output_schema["type"] == "object":
            try:
                import json
                from jsonschema import validate
                
                # Try to parse as JSON first
                try:
                    parsed_response = json.loads(llm_response)
                except json.JSONDecodeError:
                    # If not valid JSON, try to extract JSON from the response
                    # Look for content between curly braces
                    import re
                    json_match = re.search(r'{.*}', llm_response, re.DOTALL)
                    if json_match:
                        parsed_response = json.loads(json_match.group(0))
                    else:
                        raise HTTPException(
                            status_code=422,
                            detail="LLM response was not valid JSON and could not extract JSON content"
                        )

                # Convert template schema to JSON Schema format
                json_schema = {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False
                }
                
                for field_name, field_spec in template.output_schema["schema"]["fields"].items():
                    json_schema["properties"][field_name] = {"type": field_spec["type"]}
                    json_schema["required"].append(field_name)
                
                # Validate against schema
                validate(instance=parsed_response, schema=json_schema)
                response = parsed_response
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )
            except Exception as schema_error:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response did not match expected schema: {str(schema_error)}"
                )

        # Get usage statistics
        usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }

        return LLMExecuteResponse(
            response=response,
            usage=usage
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompt-templates", response_model=PromptTemplateResponse)
def create_prompt_template(
    template_data: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt template"""
    try:
        # Convert the Pydantic model to dict
        data = template_data.model_dump()
        # Handle output_schema separately
        output_schema = data.pop('output_schema', None)
        
        template = PromptTemplate(
            template_id=str(uuid4()),
            output_schema=output_schema,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **data
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return template
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
def update_prompt_template(
    template_id: str,
    template_data: PromptTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")

    try:
        # Update fields
        update_data = template_data.model_dump(exclude_unset=True)
        
        # Handle output_schema separately since it's already a dict after model_dump
        output_schema = update_data.pop('output_schema', None)
        if output_schema is not None:
            setattr(template, 'output_schema', output_schema)
            
        # Update remaining fields
        for key, value in update_data.items():
            setattr(template, key, value)
        
        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(template)
        return template
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/prompt-templates/{template_id}")
def delete_prompt_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """Delete a prompt template"""
    # First check if template exists
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")

    # Check if template is being used by any workflow steps
    workflow_steps = db.query(WorkflowStep).filter(WorkflowStep.prompt_template == template_id).all()
    if workflow_steps:
        # Get workflow names for better error message
        workflow_names = [step.workflow.name for step in workflow_steps]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete template because it is being used in the following workflows: {', '.join(workflow_names)}"
        )

    try:
        db.delete(template)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompt-templates/test", response_model=LLMExecuteResponse)
async def test_prompt_template(
    test_data: PromptTemplateTest,
    db: Session = Depends(get_db)
):
    """Test a prompt template with parameters"""
    try:
        # Format the prompt using the template and parameters
        prompt = test_data.template
        for token in test_data.tokens:
            if token not in test_data.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required parameter: {token}"
                )
            prompt = prompt.replace(f"{{{{{token}}}}}", str(test_data.parameters[token]))

        # Execute the LLM request
        llm_response = await ai_service.provider.generate(
            prompt=prompt,
            max_tokens=1000  # Reasonable default for testing
        )

        # if output_schema is object, parse the response as JSON
        if test_data.output_schema["type"] == "object":
            import json
            try:
                llm_response = json.loads(llm_response) 
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )

        # Process response based on schema type
        return {"response": llm_response, "usage": {"prompt_tokens": 0, "completion_tokens": 0}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 