from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from uuid import uuid4
import base64

from database import get_db
from models import File
from schemas import FileCreate, FileUpdate, FileResponse, FileContentResponse
from services.auth_service import validate_token
from models import User

router = APIRouter(
    prefix="/api/files",
    tags=["files"]
)

@router.post("", response_model=FileResponse)
async def create_file(
    file: UploadFile = FastAPIFile(...),
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Create a new file"""
    try:
        content = await file.read()
        
        db_file = File(
            file_id=str(uuid4()),
            user_id=current_user.user_id,
            name=file.filename,
            description=description,
            content=content,  # Store as binary
            mime_type=file.content_type,
            size=len(content)
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        return FileResponse.model_validate(db_file)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[FileResponse])
def get_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get all files for the current user"""
    files = db.query(File).filter(File.user_id == current_user.user_id).all()
    return [FileResponse.model_validate(f) for f in files]

@router.get("/{file_id}", response_model=FileResponse)
def get_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get a specific file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse.model_validate(file)

@router.get("/{file_id}/content")
def get_file_content(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get a file's content"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # For text files, try to return as plain text
    if file.mime_type.startswith('text/') or file.mime_type in ['application/json', 'application/javascript']:
        try:
            text_content = file.content.decode('utf-8')
            return JSONResponse(content={"content": text_content})
        except UnicodeDecodeError:
            # If we can't decode as UTF-8, fall back to base64
            pass
    
    # For binary files or failed text decoding, return base64 encoded
    encoded_content = base64.b64encode(file.content).decode('utf-8')
    return JSONResponse(content={"content": encoded_content, "encoding": "base64"})

@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Download a file with proper content type"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return Response(
        content=file.content,
        media_type=file.mime_type,
        headers={
            'Content-Disposition': f'attachment; filename="{file.name}"'
        }
    )

@router.put("/{file_id}", response_model=FileResponse)
def update_file(
    file_id: str,
    file_update: FileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update a file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        update_data = file_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(file, key, value)
            if key == 'content':
                file.size = len(value)
                
        file.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(file)
        return FileResponse.model_validate(file)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Delete a file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        db.delete(file)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 