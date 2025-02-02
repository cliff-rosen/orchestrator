from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Tool, PromptTemplate
from schemas import ToolResponse, PromptTemplateResponse, LLMExecuteRequest, LLMExecuteResponse
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
        prompt = template.template
        for token in template.tokens:
            if token not in request.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required parameter: {token}"
                )
            prompt = prompt.replace(f"{{{{{token}}}}}", str(request.parameters[token]))

        # Execute the LLM request
        response = await ai_service.provider.generate(
            prompt=prompt,
            model=request.model,
            max_tokens=request.max_tokens
        )

        # Get usage statistics
        # Note: This assumes the LLM provider returns usage stats
        # You may need to modify this based on your provider implementation
        usage = {
            "prompt_tokens": 0,  # Replace with actual values from your provider
            "completion_tokens": 0,
            "total_tokens": 0
        }

        return LLMExecuteResponse(
            response=response,
            usage=usage
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 