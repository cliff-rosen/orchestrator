from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from uuid import uuid4
import random
import json
import base64
import re

from database import get_db
from models import Tool, PromptTemplate, WorkflowStep, File, FileImage
from schemas import (
    ToolResponse, PromptTemplateResponse, LLMExecuteRequest, LLMExecuteResponse,
    PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest, ToolSignature
)
from services.ai_service import AIService
from services.auth_service import validate_token
from models import User
from services import ai_service
from routers.files import get_file_content_as_text
from services.workflow_service import WorkflowService

router = APIRouter(
    prefix="/api",
    tags=["tools"]
)

# Initialize AI service
ai_service = AIService()

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
async def list_prompt_templates(db: Session = Depends(get_db)):
    """List all prompt templates"""
    templates = db.query(PromptTemplate).all()
    return templates

@router.get("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """Get a prompt template by ID"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/prompt-templates/{template_id}/signature", response_model=ToolSignature)
async def get_prompt_template_signature(template_id: str, db: Session = Depends(get_db)):
    """Get a prompt template's tool signature"""
    workflow_service = WorkflowService(db)
    signature = workflow_service._get_llm_signature(template_id)
    return signature

@router.post("/execute_llm", response_model=LLMExecuteResponse)
async def execute_llm(request: LLMExecuteRequest, db: Session = Depends(get_db)):
    """Execute an LLM prompt template with provided parameters"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == request.prompt_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Validate all required tokens are provided
    for token in template.tokens:
        if token['type'] == 'string' and token['name'] not in request.regular_variables:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required string token: {token['name']}"
            )
        elif token['type'] == 'file' and token['name'] not in request.file_variables:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required file token: {token['name']}"
            )

    # Split template on file tokens to get text parts
    parts = re.split(r'(<<file:\w+>>)', template.user_message_template)
    
    # Build message content parts
    content_parts = []
    
    for part in parts:
        if part.startswith('<<file:') and part.endswith('>>'):
            # Extract token name
            token_name = part[7:-2]
            
            # Get file ID
            if token_name not in request.file_variables:
                continue
                
            file_id = request.file_variables[token_name]
            
            # Get file content from database
            file = db.query(File).filter(File.file_id == file_id).first()
            if not file:
                raise HTTPException(
                    status_code=404,
                    detail=f"File not found: {file_id}"
                )
            
            # Add extracted text if available
            if file.extracted_text:
                content_parts.append({
                    'type': 'text',
                    'text': file.extracted_text
                })
            
            # Get and add associated images
            images = db.query(FileImage).filter(FileImage.file_id == file_id).all()
            for image in images:
                content_parts.append({
                    'type': 'image_url',
                    'image_url': f"/api/files/{file_id}/images/{image.image_id}"
                })
        else:
            # Regular text part - replace tokens
            text = part
            for token_name, value in request.regular_variables.items():
                text = text.replace(f"{{{{{token_name}}}}}", str(value))
            
            if text.strip():
                content_parts.append({
                    'type': 'text',
                    'text': text
                })

    # Build messages array
    messages = []
    
    # Add system message if present
    if template.system_message_template:
        # Replace tokens in system message
        system_message = template.system_message_template
        for token_name, value in request.regular_variables.items():
            system_message = system_message.replace(f"{{{{{token_name}}}}}", str(value))
        
        messages.append({
            'role': 'system',
            'content': system_message
        })
        
    # Add user message with content parts
    messages.append({
        'role': 'user',
        'content': content_parts
    })

    try:
        # Call LLM using AI service
        llm_response = await ai_service.send_messages(
            messages=messages,
            model=request.model,
            max_tokens=request.max_tokens
        )

        # Process response based on schema type
        response = llm_response
        if template.output_schema["type"] == "object":
            try:
                response = json.loads(llm_response)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )

        return LLMExecuteResponse(
            template_id=template.template_id,
            messages=messages,
            response=response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling LLM: {str(e)}")

@router.post("/prompt-templates", response_model=PromptTemplateResponse)
async def create_prompt_template(
    template: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt template"""
    db_template = PromptTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    template: PromptTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update a prompt template"""
    db_template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template.model_dump(exclude_unset=True).items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/prompt-templates/{template_id}")
async def delete_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """Delete a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"status": "success"}

@router.post("/prompt-templates/test", response_model=LLMExecuteResponse)
async def test_prompt_template(
    test_data: PromptTemplateTest,
    db: Session = Depends(get_db)
):
    """Test a prompt template with parameters"""
    try:
        # Format both templates
        user_message = test_data.user_message_template
        system_message = test_data.system_message_template
        
        # Replace string tokens in both templates
        string_tokens = [t['name'] for t in test_data.tokens if t['type'] == 'string']
        for token_name in string_tokens:
            if token_name not in test_data.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required string token: {token_name}"
                )
            value = str(test_data.parameters[token_name])
            if system_message:
                system_message = system_message.replace(f"{{{{{token_name}}}}}", value)
            user_message = user_message.replace(f"{{{{{token_name}}}}}", value)
            
        # Handle file tokens
        file_tokens = [t['name'] for t in test_data.tokens if t['type'] == 'file']
        for token_name in file_tokens:
            file_param = token_name
            if file_param not in test_data.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required file token: {token_name}"
                )
            file_id = test_data.parameters[file_param]
            file_content = await get_file_content_as_text(file_id, db)
            if system_message:
                system_message = system_message.replace(f"<<file:{token_name}>>", file_content)
            user_message = user_message.replace(f"<<file:{token_name}>>", file_content)

        # Build messages array
        messages = []
        if system_message:
            messages.append({
                'role': 'system',
                'content': system_message
            })
        messages.append({
            'role': 'user',
            'content': user_message
        })

        # Execute the LLM request
        response = await ai_service.send_messages(
            messages=messages,
            max_tokens=1000
        )

        # Process response based on schema type
        if test_data.output_schema["type"] == "object":
            try:
                response = json.loads(response)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )

        return LLMExecuteResponse(
            template_id=None,
            messages=messages,
            response=response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 