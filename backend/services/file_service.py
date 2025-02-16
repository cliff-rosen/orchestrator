from sqlalchemy.orm import Session
from models import File, FileImage
from fastapi import HTTPException
import base64
import logging

logger = logging.getLogger(__name__)

class FileService:
    def __init__(self, db: Session):
        self.db = db

    def get_file(self, file_id: str) -> File:
        """Get a file by ID"""
        file = self.db.query(File).filter(File.file_id == file_id).first()
        if not file:
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        return file

    async def get_file_content(self, file_id: str) -> str:
        """Get a file's content as text"""
        file = self.get_file(file_id)
        
        # If we have extracted text, use that
        if file.extracted_text:
            return file.extracted_text
        
        # For text files, try to decode as UTF-8
        if file.mime_type.startswith('text/') or file.mime_type in ['application/json', 'application/javascript']:
            try:
                return file.content.decode('utf-8')
            except UnicodeDecodeError:
                pass
        
        # For binary files or failed text decoding, return base64 encoded
        return base64.b64encode(file.content).decode('utf-8')

    def get_file_images(self, file_id: str) -> list[FileImage]:
        """Get all images associated with a file"""
        return self.db.query(FileImage).filter(FileImage.file_id == file_id).all()

# Create a singleton instance
file_service = FileService(None)  # DB will be set during request handling 