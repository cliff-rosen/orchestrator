from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

##### USER SCHEMA #####


class UserBase(BaseModel):
    """Base schema for user data"""
    email: EmailStr = Field(description="User's email address")


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(
        min_length=5,
        description="User's password",
        example="securepassword123"
    )


class UserResponse(UserBase):
    """Schema for user responses"""
    user_id: int = Field(description="Unique identifier for the user")
    registration_date: datetime = Field(description="When the user registered")

    model_config = ConfigDict(from_attributes=True)


##### AUTH SCHEMA #####

class Token(BaseModel):
    """Schema for authentication tokens"""
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Type of token")
    username: str = Field(description="User's username")


class TokenData(BaseModel):
    """Schema for token payload data"""
    email: Optional[str] = Field(
        default=None, description="User's email from token")
    user_id: Optional[int] = Field(
        default=None, description="User's ID from token")
    username: Optional[str] = Field(
        default=None, description="User's username")


##### SEARCH SCHEMA #####

class SearchResult(BaseModel):
    """Schema for search results"""
    title: str = Field(description="Title of the search result")
    link: str = Field(description="Link to the search result")
    snippet: str = Field(description="Snippet of the search result")
    displayLink: str = Field(description="Display link of the search result")
    pagemap: Optional[Dict[str, Any]] = {}
    relevance_score: float = Field(
        default=0.0,
        description="AI-generated relevance score from 0-100",
        ge=0.0,
        le=100.0
    )


class FetchURLsRequest(BaseModel):
    """Request model for fetching multiple URLs"""
    urls: List[str] = Field(description="List of URLs to fetch content from")


class URLContent(BaseModel):
    """Schema for URL content response"""
    url: str
    title: str
    text: str
    error: str = ""
    content_type: str = 'text'  # One of: 'html', 'markdown', 'code', 'text'


##### RESEARCH SCHEMA #####


class CurrentEventsCheck(BaseModel):
    """Schema for current events context check results"""
    requires_current_context: bool = Field(
        description="Whether the question requires current events context"
    )
    reasoning: str = Field(
        description="Explanation of why current context is or isn't needed"
    )
    timeframe: str = Field(
        description="If context is needed, how recent should the context be"
    )
    key_events: List[str] = Field(
        description="Key events or developments to look for"
    )
    search_queries: List[str] = Field(
        description="Suggested search queries to gather context"
    )

    model_config = ConfigDict(from_attributes=True)


class QuestionAnalysis(BaseModel):
    """Schema for question analysis results"""
    key_components: List[str] = Field(
        description="Key components identified in the question"
    )
    scope_boundaries: List[str] = Field(
        description="Identified boundaries and scope of the question"
    )
    success_criteria: List[str] = Field(
        description="Criteria for a successful answer"
    )
    conflicting_viewpoints: List[str] = Field(
        description="Potential conflicting viewpoints to consider"
    )

    model_config = ConfigDict(from_attributes=True)


class ExecuteQueriesRequest(BaseModel):
    """Request model for executing multiple search queries"""
    queries: List[str] = Field(description="List of search queries to execute")


class GetResearchAnswerRequest(BaseModel):
    """Request model for getting research answers"""
    question: str = Field(description="The research question to answer")
    source_content: List[URLContent] = Field(
        description="List of URL content to analyze")


class EvaluateAnswerRequest(BaseModel):
    """Request model for evaluating research answers"""
    question: str = Field(description="The original research question")
    analysis: QuestionAnalysis = Field(
        description="The analysis of the question's components")
    answer: str = Field(description="The answer to evaluate")


class ResearchEvaluation(BaseModel):
    """Schema for evaluating how well an answer addresses a question"""
    completeness_score: float = Field(
        description="Score for how completely the answer addresses all aspects of the question (0-100)",
        ge=0.0,
        le=100.0
    )
    accuracy_score: float = Field(
        description="Score for factual accuracy of the answer (0-100)",
        ge=0.0,
        le=100.0
    )
    relevance_score: float = Field(
        description="Score for how relevant the answer is to the question (0-100)",
        ge=0.0,
        le=100.0
    )
    overall_score: float = Field(
        description="Overall evaluation score (0-100)",
        ge=0.0,
        le=100.0
    )
    missing_aspects: List[str] = Field(
        description="Key aspects of the question that were not addressed in the answer"
    )
    improvement_suggestions: List[str] = Field(
        description="Specific suggestions for improving the answer"
    )
    conflicting_aspects: List[Dict[str, str]] = Field(
        description="Aspects of the answer that conflict with requirements or have internal inconsistencies",
        default_factory=list,
        example=[
            {
                "aspect": "Timeline of events",
                "conflict": "Answer states the event occurred in 2020 but later references it happening in 2021"
            },
            {
                "aspect": "Scope boundary",
                "conflict": "Answer discusses European markets when question specifically asked about Asian markets"
            }
        ]
    )

    model_config = ConfigDict(from_attributes=True)


class ResearchAnswer(BaseModel):
    """Schema for final research answer"""
    answer: str = Field(description="Final synthesized answer")
    sources_used: List[str] = Field(
        description="List of sources used in the answer")
    confidence_score: float = Field(
        description="Confidence score for the answer (0-100)",
        ge=0.0,
        le=100.0
    )

    model_config = ConfigDict(from_attributes=True)


class ExtractKnowledgeGraphRequest(BaseModel):
    """Request model for extracting knowledge graph elements from a document."""
    document: str = Field(
        ..., 
        description="The text document to analyze for entities and relationships",
        examples=["John's company 'Tech Corp' leads the industry. The CEO manages operations."]
    )


class KnowledgeGraphNode(BaseModel):
    """Model representing a node in the knowledge graph."""
    id: str = Field(..., description="Unique identifier for the node")
    label: str = Field(..., description="Type/label of the node (e.g., Person, Company)")
    properties: Dict[str, Any] = Field(
        ..., 
        description="Properties/attributes of the node",
        examples=[{"name": "John Smith", "role": "CEO"}]
    )


class KnowledgeGraphRelationship(BaseModel):
    """Model representing a relationship in the knowledge graph."""
    source: str = Field(..., description="ID of the source node")
    target: str = Field(..., description="ID of the target node")
    type: str = Field(..., description="Type of relationship (e.g., LEADS, MANAGES)")
    properties: Dict[str, Any] = Field(
        ..., 
        description="Properties/attributes of the relationship",
        examples=[{"since": "2020"}]
    )


class KnowledgeGraphElements(BaseModel):
    """Model representing the complete set of knowledge graph elements."""
    nodes: List[KnowledgeGraphNode]
    relationships: List[KnowledgeGraphRelationship]


##### WORKFLOW SCHEMAS #####

class WorkflowVariableBase(BaseModel):
    """Base schema for workflow variables"""
    name: str = Field(description="Name of the variable")
    description: str = Field(description="Description of the variable")
    schema: Dict[str, Any] = Field(description="JSON Schema of the variable")

class WorkflowVariableCreate(WorkflowVariableBase):
    """Schema for creating workflow variables"""
    pass

class WorkflowVariableResponse(WorkflowVariableBase):
    """Schema for workflow variable responses"""
    variable_id: str = Field(description="Unique identifier for the variable")
    workflow_id: str = Field(description="ID of the workflow this variable belongs to")
    variable_type: str = Field(description="Type of variable (input/output)")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkflowStepBase(BaseModel):
    """Base schema for workflow steps"""
    label: str = Field(description="Label for the step")
    description: str = Field(description="Description of the step")
    step_type: str = Field(description="Type of step (e.g., ACTION, INPUT)")
    tool_id: Optional[str] = Field(None, description="ID of the tool to use for this step")
    next_step_id: Optional[str] = Field(None, description="ID of the next step in the workflow")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the step")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Output mappings for the step")

class WorkflowStepCreate(WorkflowStepBase):
    """Schema for creating workflow steps"""
    pass

class WorkflowStepResponse(WorkflowStepBase):
    """Schema for workflow step responses"""
    step_id: str = Field(description="Unique identifier for the step")
    workflow_id: str = Field(description="ID of the workflow this step belongs to")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkflowBase(BaseModel):
    """Base schema for workflows"""
    name: str = Field(description="Name of the workflow")
    description: str = Field(description="Description of the workflow")

class WorkflowCreate(WorkflowBase):
    """Schema for creating workflows"""
    pass

class WorkflowUpdate(BaseModel):
    """Schema for updating workflows"""
    name: Optional[str] = Field(None, description="New name for the workflow")
    description: Optional[str] = Field(None, description="New description for the workflow")
    status: Optional[str] = Field(None, description="New status for the workflow")
    steps: Optional[List[WorkflowStepCreate]] = Field(None, description="Updated steps for the workflow")
    inputs: Optional[List[WorkflowVariableCreate]] = Field(None, description="Updated input variables for the workflow")
    outputs: Optional[List[WorkflowVariableCreate]] = Field(None, description="Updated output variables for the workflow")

class WorkflowResponse(WorkflowBase):
    """Schema for workflow responses"""
    workflow_id: str = Field(description="Unique identifier for the workflow")
    user_id: int = Field(description="ID of the user who owns this workflow")
    status: str = Field(description="Current status of the workflow")
    error: Optional[str] = Field(None, description="Error message if workflow failed")
    created_at: datetime
    updated_at: datetime
    steps: List[WorkflowStepResponse] = Field(default_factory=list)
    variables: List[WorkflowVariableResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class WorkflowExecuteRequest(BaseModel):
    """Schema for workflow execution requests"""
    input_data: Dict[str, Any] = Field(description="Input data for the workflow")

class WorkflowExecuteResponse(BaseModel):
    """Schema for workflow execution responses"""
    workflow_id: str = Field(description="ID of the executed workflow")
    status: str = Field(description="Execution status")
    output: Dict[str, Any] = Field(description="Output data from the workflow")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    execution_time: float = Field(description="Time taken to execute the workflow in seconds")

    model_config = ConfigDict(from_attributes=True)

##### TOOL SCHEMAS #####

class ToolParameter(BaseModel):
    """Schema for tool parameter definition"""
    name: str = Field(description="Name of the parameter")
    type: str = Field(description="Type of the parameter (string, number, boolean, etc.)")
    description: str = Field(description="Description of the parameter")
    required: bool = Field(default=True, description="Whether the parameter is required")
    default: Optional[Any] = Field(None, description="Default value for the parameter")

class ToolOutput(BaseModel):
    """Schema for tool output definition"""
    name: str = Field(description="Name of the output")
    type: str = Field(description="Type of the output (string, number, boolean, etc.)")
    description: str = Field(description="Description of the output")

class ToolSignature(BaseModel):
    """Schema for tool signature"""
    parameters: List[ToolParameter] = Field(
        default_factory=list,
        description="Parameters accepted by the tool"
    )
    outputs: List[ToolOutput] = Field(
        default_factory=list,
        description="Outputs produced by the tool"
    )

class ToolBase(BaseModel):
    """Base schema for tools"""
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of the tool")
    tool_type: str = Field(description="Type of tool")
    signature: ToolSignature = Field(description="Tool's parameter and output signature")

class ToolCreate(ToolBase):
    """Schema for creating tools"""
    pass

class ToolUpdate(BaseModel):
    """Schema for updating tools"""
    name: Optional[str] = Field(None, description="New name for the tool")
    description: Optional[str] = Field(None, description="New description for the tool")
    signature: Optional[ToolSignature] = Field(None, description="New signature for the tool")

class ToolResponse(ToolBase):
    """Schema for tool responses"""
    tool_id: str = Field(description="Unique identifier for the tool")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
