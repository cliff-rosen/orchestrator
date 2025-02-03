from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote
from datetime import datetime
from typing import Optional
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint

Base = declarative_base()

# Constants
ALL_TOPICS = -1  # Special value for chat threads to indicate "all topics" view

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    registration_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    topics = relationship("Topic", back_populates="user")
    workflows = relationship("Workflow", back_populates="user")

class Topic(Base):
    __tablename__ = "topics"
    
    topic_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    topic_name = Column(String(255))
    creation_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="topics")

class Tool(Base):
    __tablename__ = "tools"

    tool_id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    tool_type = Column(String(50), nullable=False)  # 'llm', 'search', 'retrieve', 'utility'
    signature = Column(JSON, nullable=False)  # Contains parameters and outputs schema
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow_steps = relationship("WorkflowStep", back_populates="tool")

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"
    
    template_id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template = Column(Text, nullable=False)
    tokens = Column(JSON, nullable=False)  # List of tokens
    output_schema = Column(JSON, nullable=False)  # Output type and schema definition
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    step_id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("workflows.workflow_id"), nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(Text)
    step_type = Column(String(50), nullable=False)  # 'ACTION' or 'INPUT'
    tool_id = Column(String(36), ForeignKey("tools.tool_id"), nullable=True)
    next_step_id = Column(String(36), ForeignKey("workflow_steps.step_id"), nullable=True)
    parameter_mappings = Column(JSON, nullable=False, default=dict)  # Maps tool parameters to workflow variables
    output_mappings = Column(JSON, nullable=False, default=dict)  # Maps tool outputs to workflow variables
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = relationship("Workflow", back_populates="steps")
    tool = relationship("Tool", back_populates="workflow_steps")
    next_step = relationship("WorkflowStep", remote_side=[step_id])
  
class WorkflowVariable(Base):
    __tablename__ = "workflow_variables"

    variable_id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("workflows.workflow_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    schema = Column(JSON, nullable=False)  # JSON Schema of the variable
    variable_type = Column(String(50), nullable=False)  # 'input' or 'output'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = relationship("Workflow", back_populates="variables")

class Workflow(Base):
    __tablename__ = "workflows"

    workflow_id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default="draft")  # draft, running, completed, failed
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="workflows")
    steps = relationship("WorkflowStep", back_populates="workflow", cascade="all, delete-orphan")
    variables = relationship("WorkflowVariable", back_populates="workflow", cascade="all, delete-orphan")

