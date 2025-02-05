from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services.workflow_service import WorkflowService
from services.auth_service import validate_token
from schemas import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowStepCreate,
    WorkflowExecuteRequest,
    WorkflowResponse,
    WorkflowStepResponse
)
from models import User

router = APIRouter()

##### Workflows  #####
@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """List all workflows for the current user."""
    workflow_service = WorkflowService(db)
    return workflow_service.get_workflows(current_user.user_id)

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new workflow."""
    workflow_service = WorkflowService(db)
    return workflow_service.create_workflow(workflow_data, current_user.user_id)


##### Workflow (individual) #####

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get a specific workflow by ID."""
    workflow_service = WorkflowService(db)
    try:
        return workflow_service.get_workflow(workflow_id, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update an existing workflow."""
    workflow_service = WorkflowService(db)
    try:
        return workflow_service.update_workflow(workflow_id, workflow_data, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a workflow."""
    workflow_service = WorkflowService(db)
    try:
        workflow_service.delete_workflow(workflow_id, current_user.user_id)
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{workflow_id}/steps", response_model=WorkflowStepResponse)
async def add_workflow_step(
    workflow_id: str,
    step_data: WorkflowStepCreate,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Add a step to a workflow."""
    workflow_service = WorkflowService(db)
    try:
        return workflow_service.add_step(workflow_id, step_data, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    execution_data: WorkflowExecuteRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Execute a workflow."""
    workflow_service = WorkflowService(db)
    try:
        return await workflow_service.execute_workflow(workflow_id, execution_data, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 