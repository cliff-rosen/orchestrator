import { Tool, ToolParameterName, ToolOutputName } from './tools';
import { Schema, Variable, ValueType, SchemaValueType } from './schema';

export enum WorkflowStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED'
}

export enum WorkflowStepType {
    ACTION = 'ACTION',
    INPUT = 'INPUT',
    EVALUATION = 'EVALUATION'
}

// Type-safe workflow variable references
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Execution result for runtime steps
export interface StepExecutionResult {
    success: boolean;
    error?: string;
    outputs?: Record<WorkflowVariableName, SchemaValueType>;
}

// Evaluation result that determines the next step in workflow
export interface EvaluationResult extends StepExecutionResult {
    next_action: 'continue' | 'jump' | 'end';
    target_step_index?: number;  // Only required when next_action is 'jump'
    reason?: string;  // Optional explanation for the decision
}

// Evaluation condition operators
export type EvaluationOperator =
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains';

// Evaluation condition configuration
export interface EvaluationCondition {
    condition_id: string;
    variable: WorkflowVariableName;
    operator: EvaluationOperator;
    value: any;
    target_step_index?: number;  // Step to jump to if condition is met
}

// Evaluation configuration for workflow steps
export interface EvaluationConfig {
    conditions: EvaluationCondition[];
    default_action: 'continue' | 'end';  // What to do if no conditions match
}

// Runtime step that includes execution functions
export interface RuntimeWorkflowStep extends WorkflowStep {
    // Execute the step and return its results
    action: () => Promise<StepExecutionResult>;
    // Get the text to display on the action button
    actionButtonText: () => string;
    // Check if the step can be executed
    isDisabled: () => boolean;
    // Get any validation errors that would prevent execution
    getValidationErrors: () => string[];
}

// Workflow variable extends base Variable with I/O type and required flag
export interface WorkflowVariable extends Omit<Variable, 'name'> {
    name: WorkflowVariableName;  // Reference name in workflow context
    io_type: 'input' | 'output';
    // Required flag only applies to inputs and defaults to true
    required?: boolean;
}

// Branded type for workflow step IDs
export type WorkflowStepId = string & { readonly __brand: unique symbol };

// Workflow step definition
export interface WorkflowStep {
    step_id: WorkflowStepId;
    workflow_id: string;
    label: string;
    description: string;
    step_type: WorkflowStepType;
    tool?: Tool;
    tool_id?: string;
    // Only present for LLM tools
    prompt_template_id?: string;
    // Maps tool parameter names to workflow variable names
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    // Maps tool output names to workflow variable names
    output_mappings: Record<ToolOutputName, WorkflowVariableName>;
    // Only for EVALUATION steps
    evaluation_config?: EvaluationConfig;
    sequence_number: number;
    created_at: string;
    updated_at: string;
}

// Complete workflow definition
export interface Workflow {
    workflow_id: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    // Variables for collecting input values
    inputs?: WorkflowVariable[];
    // Variables for storing output values
    outputs?: WorkflowVariable[];
    steps: WorkflowStep[];
}

// Default workflow with empty arrays
export const DEFAULT_WORKFLOW: Workflow = {
    workflow_id: '',
    name: 'Untitled Workflow',
    description: 'A new custom workflow',
    status: WorkflowStatus.DRAFT,
    steps: [],
    inputs: [],
    outputs: []
};

// Helper function to create a workflow variable with type safety
export const createWorkflowVariable = (
    variable_id: string,
    name: string,
    schema: Schema,
    io_type: WorkflowVariable['io_type'],
    required: boolean = true
): WorkflowVariable => ({
    variable_id,
    name: name as WorkflowVariableName,
    schema,
    io_type,
    ...(io_type === 'input' ? { required } : {})
});

// Helper function to create an array schema
export const createArraySchema = (
    itemType: ValueType,
    description?: string
): Schema => ({
    type: itemType,
    description,
    is_array: true
});

// Helper function to create a basic schema
export const createBasicSchema = (
    type: ValueType,
    description?: string
): Schema => ({
    type,
    description,
    is_array: false
});

// Validation utilities
export const isWorkflowInput = (
    variable: WorkflowVariable
): variable is WorkflowVariable & { io_type: 'input'; required: boolean } => {
    return variable.io_type === 'input';
};

export const isWorkflowOutput = (
    variable: WorkflowVariable
): variable is WorkflowVariable & { io_type: 'output' } => {
    return variable.io_type === 'output';
};

// Type guard for LLM steps
export const isLLMStep = (step: WorkflowStep): step is WorkflowStep & { tool: Tool & { tool_type: 'llm' } } => {
    return step.tool?.tool_type === 'llm';
};

// Example workflow demonstrating various features
export const EXAMPLE_WORKFLOW: Workflow = {
    workflow_id: "example-research-workflow",
    name: "Research Paper Analysis Workflow",
    description: "A workflow that searches for research papers, analyzes them with an LLM, and generates a summary",
    status: WorkflowStatus.PUBLISHED,
    inputs: [
        {
            variable_id: "search-query-var",
            name: "search_query" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "The search query for finding research papers",
                is_array: false
            },
            io_type: "input",
            required: true
        },
        {
            variable_id: "max-papers-var",
            name: "max_papers" as WorkflowVariableName,
            schema: {
                type: "number",
                description: "Maximum number of papers to analyze",
                is_array: false
            },
            io_type: "input",
            required: false
        }
    ],
    outputs: [
        {
            variable_id: "summary-var",
            name: "final_summary" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Final summarized analysis of all papers",
                is_array: false
            },
            io_type: "output"
        },
        {
            variable_id: "paper-details-var",
            name: "paper_details" as WorkflowVariableName,
            schema: {
                type: "object",
                description: "Detailed information about each analyzed paper",
                is_array: true,
                fields: {
                    title: {
                        type: "string",
                        description: "Paper title",
                        is_array: false
                    },
                    authors: {
                        type: "string",
                        description: "Paper authors",
                        is_array: true
                    },
                    summary: {
                        type: "string",
                        description: "Individual paper summary",
                        is_array: false
                    }
                }
            },
            io_type: "output"
        }
    ],
    steps: [
        {
            step_id: "search-step" as WorkflowStepId,
            workflow_id: "example-research-workflow",
            label: "Search PubMed",
            description: "Search for research papers on PubMed",
            step_type: WorkflowStepType.ACTION,
            tool_id: "pubmed",
            sequence_number: 1,
            parameter_mappings: {
                query: "search_query" as WorkflowVariableName,
                max_results: "max_papers" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                search_results: "pubmed_results" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "analysis-step" as WorkflowStepId,
            workflow_id: "example-research-workflow",
            label: "Analyze Papers",
            description: "Use LLM to analyze each research paper",
            step_type: WorkflowStepType.ACTION,
            tool_id: "llm",
            prompt_template_id: "paper-analysis-template",
            sequence_number: 2,
            parameter_mappings: {
                papers: "pubmed_results" as WorkflowVariableName,
                analysis_type: "detailed" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                paper_analyses: "paper_details" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "summary-step" as WorkflowStepId,
            workflow_id: "example-research-workflow",
            label: "Generate Summary",
            description: "Create a final summary of all analyzed papers",
            step_type: WorkflowStepType.ACTION,
            tool_id: "llm",
            prompt_template_id: "summary-template",
            sequence_number: 3,
            parameter_mappings: {
                analyses: "paper_details" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                summary: "final_summary" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ]
};

