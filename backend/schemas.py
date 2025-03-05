from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any, Union, Literal
from enum import Enum
import base64
import json
from pydantic import field_validator

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


##### TOOL SCHEMAS #####

class SchemaValue(BaseModel):
    type: str = Field(description="Base type (string, number, boolean, object)")
    description: Optional[str] = None
    is_array: bool = Field(default=False, description="Whether this is an array of the base type")
    fields: Optional[Dict[str, Any]] = Field(None, description="Fields for object type")
    # File-specific fields
    format: Optional[str] = Field(None, description="Format specification")
    content_types: Optional[List[str]] = Field(None, description="Allowed content types")
    
    model_config = ConfigDict(extra="allow")  # Allow extra fields for flexibility

class ToolParameter(BaseModel):
    """Schema for tool parameter definition"""
    name: str = Field(description="Name of the parameter")
    description: str = Field(description="Description of the parameter")
    schema: SchemaValue = Field(description="Schema defining the parameter type and structure")
    required: bool = Field(default=True, description="Whether the parameter is required")
    default: Optional[Any] = Field(None, description="Default value for the parameter")
    
    model_config = ConfigDict(extra="allow")  # Allow extra fields for flexibility

class ToolOutput(BaseModel):
    """Schema for tool output definition"""
    name: str = Field(description="Name of the output")
    description: str = Field(description="Description of the output")
    schema: SchemaValue = Field(description="Schema defining the output type and structure")
    
    model_config = ConfigDict(extra="allow")  # Allow extra fields for flexibility

class ParameterSchema(BaseModel):
    name: str
    description: str
    schema: SchemaValue
    
    model_config = ConfigDict(extra="allow")

class OutputSchema(BaseModel):
    name: str
    description: str
    schema: SchemaValue
    
    model_config = ConfigDict(extra="allow")

class ToolSignature(BaseModel):
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    
    model_config = ConfigDict(extra="allow")  # Allow extra fields for flexibility

class ToolBase(BaseModel):
    """Base schema for tools"""
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of the tool")
    tool_type: str = Field(description="Type of tool")
    signature: Dict[str, Any] = Field(description="Tool's parameter and output signature")
    
    model_config = ConfigDict(extra="allow")

class ToolCreate(ToolBase):
    """Schema for creating tools"""
    pass

class ToolUpdate(BaseModel):
    """Schema for updating tools"""
    name: Optional[str] = Field(None, description="New name for the tool")
    description: Optional[str] = Field(None, description="New description for the tool")
    signature: Optional[Dict[str, Any]] = Field(None, description="New signature for the tool")
    
    model_config = ConfigDict(extra="allow")

class ToolResponse(BaseModel):
    """Schema for tool responses"""
    tool_id: str = Field(description="Unique identifier for the tool")
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of the tool")
    tool_type: str = Field(description="Type of tool")
    signature: Dict[str, Any] = Field(description="Tool's parameter and output signature")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('signature', mode='before')
    @classmethod
    def validate_signature(cls, v):
        """Ensure signature is properly formatted"""
        if isinstance(v, dict):
            return v
        elif isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return {"parameters": [], "outputs": []}
        return v

class VariableType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    FILE = "file"
    OBJECT = "object"

class VariableSchema(BaseModel):
    """Schema for variable type and format"""
    name: Optional[str] = Field(None, description="Name of the schema")
    type: VariableType = Field(description="Type of the schema")
    description: Optional[str] = Field(None, description="Description of the schema")
    array_type: bool = Field(default=False, description="Whether this is an array type")
    fields: Optional[Dict[str, 'VariableSchema']] = Field(None, description="Fields for object type")
    # File-specific fields
    format: Optional[str] = Field(None, description="Format specification (e.g., 'pdf' for files)")
    content_types: Optional[List[str]] = Field(None, description="Allowed content types")
    file_id: Optional[str] = Field(None, description="File ID for file types")

class Variable(BaseModel):
    """Schema for template variables"""
    name: str = Field(description="Name of the variable")
    type: VariableType = Field(description="Type of the variable")
    description: Optional[str] = Field(None, description="Description of the variable")
    required: bool = Field(default=True, description="Whether the variable is required")
    schema: SchemaValue = Field(description="Schema defining the variable type and structure")

class PromptTemplateToken(BaseModel):
    """Schema for a prompt template token"""
    name: str = Field(description="Name of the token")
    type: Literal["string", "file"] = Field(description="Type of the token")

class PromptTemplateBase(BaseModel):
    """Base schema for prompt templates"""
    name: str = Field(description="Name of the template")
    description: Optional[str] = Field(None, description="Description of the template")
    user_message_template: str = Field(description="The user message template text")
    system_message_template: Optional[str] = Field(None, description="Optional system message template")
    tokens: List[PromptTemplateToken] = Field(description="List of tokens in the template", default_factory=list)
    output_schema: Dict[str, Any] = Field(description="Schema for the expected output")

class PromptTemplateCreate(PromptTemplateBase):
    """Schema for creating a new prompt template"""
    pass

class PromptTemplateUpdate(PromptTemplateBase):
    """Schema for updating an existing prompt template"""
    pass

class PromptTemplateResponse(PromptTemplateBase):
    """Schema for prompt template responses"""
    template_id: str = Field(description="Unique identifier for the template")
    created_at: datetime = Field(description="When the template was created")
    updated_at: datetime = Field(description="When the template was last updated")

    model_config = ConfigDict(from_attributes=True)

class PromptTemplateTest(BaseModel):
    """Schema for testing a prompt template"""
    user_message_template: str = Field(description="The user message template to test")
    system_message_template: Optional[str] = Field(None, description="Optional system message template to test")
    tokens: List[Dict[str, str]] = Field(description="List of tokens in the template")
    parameters: Dict[str, Any] = Field(description="Values for the template tokens")
    output_schema: Dict[str, Any] = Field(description="Expected output schema")

class LLMExecuteRequest(BaseModel):
    """Schema for executing an LLM with a prompt template"""
    prompt_template_id: str = Field(description="ID of the prompt template to use")
    regular_variables: Dict[str, Any] = Field(description="Values for regular variables")
    file_variables: Dict[str, str] = Field(description="File IDs for file variables")
    model: Optional[str] = Field(None, description="Optional model override")
    max_tokens: Optional[int] = Field(None, description="Optional max tokens override")

class LLMExecuteResponse(BaseModel):
    """Schema for LLM execution response"""
    template_id: Optional[str] = Field(None, description="ID of the template used, if any")
    messages: List[Dict[str, Any]]
    response: Any

##### WORKFLOW SCHEMAS #####

class WorkflowVariableBase(BaseModel):
    """Base schema for workflow variables"""
    name: str = Field(description="Name of the variable")
    schema: SchemaValue = Field(description="Schema of the variable")
    io_type: Literal["input", "output"] = Field(description="Whether this is an input or output variable")

class WorkflowVariableCreate(BaseModel):
    """Schema for creating workflow variables"""
    variable_id: str
    name: str
    schema: SchemaValue
    io_type: Literal["input", "output"]

class WorkflowVariableResponse(WorkflowVariableBase):
    """Schema for workflow variable responses"""
    variable_id: str = Field(description="Unique identifier for the variable")
    workflow_id: str = Field(description="ID of the workflow this variable belongs to")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EvaluationCondition(BaseModel):
    """Schema for evaluation conditions"""
    condition_id: str = Field(description="Unique identifier for the condition")
    variable: str = Field(description="Name of the variable to evaluate")
    operator: Literal['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'] = Field(description="Comparison operator")
    value: Any = Field(description="Value to compare against")
    target_step_index: Optional[int] = Field(None, description="Step to jump to if condition is met")

class EvaluationConfig(BaseModel):
    """Schema for evaluation configuration"""
    conditions: List[EvaluationCondition] = Field(description="List of conditions to evaluate")
    default_action: Literal['continue', 'end'] = Field(description="What to do if no conditions match")
    maximum_jumps: int = Field(default=1, ge=0, description="Maximum number of times conditions will be checked before forcing continue")

class WorkflowStepBase(BaseModel):
    """Base schema for workflow steps"""
    label: str = Field(description="Label for the step")
    description: str = Field(description="Description of the step")
    step_type: str = Field(description="Type of step (ACTION, INPUT, or EVALUATION)")
    tool_id: Optional[str] = Field(None, description="ID of the tool to use for this step")
    prompt_template_id: Optional[str] = Field(None, description="ID of the prompt template to use for LLM tools")
    parameter_mappings: Dict[str, str] = Field(default_factory=dict, description="Maps tool parameters to workflow variables")
    output_mappings: Dict[str, str] = Field(default_factory=dict, description="Maps tool outputs to workflow variables")
    evaluation_config: Optional[EvaluationConfig] = Field(None, description="Configuration for evaluation steps")

class WorkflowStepCreate(BaseModel):
    """Schema for creating workflow steps"""
    label: str
    description: Optional[str] = None
    step_type: str
    tool_id: Optional[str] = None
    prompt_template_id: Optional[str] = None
    parameter_mappings: Optional[dict] = None
    output_mappings: Optional[dict] = None
    evaluation_config: Optional[EvaluationConfig] = None
    sequence_number: int

class WorkflowStepResponse(WorkflowStepBase):
    """Schema for workflow step responses"""
    step_id: str
    workflow_id: str
    sequence_number: int
    created_at: datetime
    updated_at: datetime
    tool: Optional[ToolResponse]

    model_config = ConfigDict(from_attributes=True)

class WorkflowStepSimpleResponse(BaseModel):
    """Schema for simplified workflow step responses that only includes basic step fields"""
    step_id: str = Field(description="Unique identifier for the step")
    workflow_id: str = Field(description="ID of the workflow this step belongs to")
    label: str = Field(description="Label for the step")
    description: str = Field(description="Description of the step")
    step_type: str = Field(description="Type of step (ACTION, INPUT, or EVALUATION)")
    sequence_number: int = Field(description="Order of the step in the workflow")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkflowSimpleResponse(BaseModel):
    """Schema for simplified workflow responses that includes basic workflow fields and steps"""
    workflow_id: str = Field(description="Unique identifier for the workflow")
    user_id: int = Field(description="ID of the user who owns this workflow")
    name: str = Field(description="Name of the workflow")
    description: Optional[str] = Field(None, description="Description of the workflow")
    status: str = Field(description="Current status of the workflow")
    error: Optional[str] = Field(None, description="Error message if workflow failed")
    created_at: datetime
    updated_at: datetime
    steps: List[WorkflowStepSimpleResponse] = Field(default_factory=list, description="Steps in the workflow")

    model_config = ConfigDict(from_attributes=True)

class WorkflowBase(BaseModel):
    """Base schema for workflows"""
    name: str = Field(description="Name of the workflow")
    description: Optional[str] = Field(None, description="Description of the workflow")
    status: str = Field(description="Current status of the workflow")

class WorkflowCreate(BaseModel):
    """Schema for creating workflows"""
    name: str
    description: Optional[str] = None
    status: str
    steps: Optional[List[WorkflowStepCreate]] = None
    state: Optional[List[WorkflowVariableCreate]] = None

    class Config:
        from_attributes = True

class WorkflowUpdate(BaseModel):
    """Schema for updating workflows"""
    name: Optional[str] = Field(None, description="New name for the workflow")
    description: Optional[str] = Field(None, description="New description for the workflow")
    status: Optional[str] = Field(None, description="New status for the workflow")
    steps: Optional[List[WorkflowStepCreate]] = Field(None, description="Updated steps for the workflow")
    state: Optional[List[WorkflowVariableCreate]] = Field(None, description="Updated state variables for the workflow")

class WorkflowResponse(WorkflowBase):
    """Schema for workflow responses"""
    workflow_id: str = Field(description="Unique identifier for the workflow")
    user_id: int = Field(description="ID of the user who owns this workflow")
    error: Optional[str] = Field(None, description="Error message if workflow failed")
    created_at: datetime
    updated_at: datetime
    steps: List[WorkflowStepResponse] = Field(default_factory=list)
    state: List[WorkflowVariableResponse] = Field(default_factory=list)

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

##### FILE SCHEMAS #####

class FileBase(BaseModel):
    """Base schema for files"""
    name: str = Field(description="Name of the file")
    description: Optional[str] = Field(None, description="Description of the file")
    mime_type: str = Field(description="MIME type of the file")

class FileCreate(FileBase):
    """Schema for creating files"""
    content: bytes = Field(description="File contents as binary")

class FileUpdate(BaseModel):
    """Schema for updating files"""
    name: Optional[str] = Field(None, description="New name for the file")
    description: Optional[str] = Field(None, description="New description for the file")
    content: Optional[bytes] = Field(None, description="New file contents")

class FileResponse(BaseModel):
    """Schema for file responses"""
    file_id: str = Field(description="Unique identifier for the file")
    user_id: int = Field(description="ID of the user who owns this file")
    name: str = Field(description="Name of the file")
    description: Optional[str] = Field(None, description="Description of the file")
    mime_type: str = Field(description="MIME type of the file")
    size: int = Field(description="Size of the file in bytes")
    created_at: datetime = Field(description="When the file was created")
    updated_at: datetime = Field(description="When the file was last updated")
    extracted_text: Optional[str] = Field(None, description="Extracted text from the file")

    @classmethod
    def model_validate(cls, db_obj):
        return cls(
            file_id=db_obj.file_id,
            user_id=db_obj.user_id,
            name=db_obj.name,
            description=db_obj.description,
            mime_type=db_obj.mime_type,
            size=db_obj.size,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at,
            extracted_text=getattr(db_obj, 'extracted_text', None)
        )

class FileContentResponse(BaseModel):
    """Schema for file content responses"""
    content: str = Field(description="File contents (text or base64 encoded)")
    encoding: Optional[str] = Field(None, description="Encoding used for binary content (e.g., 'base64')")

    class Config:
        json_encoders = {
            bytes: lambda v: base64.b64encode(v).decode('utf-8')
        }

class FileImageResponse(BaseModel):
    image_id: str = Field(description="Unique identifier for the image")
    file_id: str = Field(description="ID of the file this image belongs to")
    mime_type: str = Field(description="MIME type of the image")
    image_data: str = Field(description="Base64 encoded image data")
