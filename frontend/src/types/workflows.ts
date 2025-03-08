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
    inputs?: Record<ToolParameterName, SchemaValueType>;
    updatedState?: WorkflowVariable[];  // Optional updated workflow state
}

/**
 * Represents the structure of evaluation outputs that are stored in the workflow state
 */
export interface EvaluationOutputs {
    condition_met: string;
    variable_name: string;
    variable_value: string;
    operator: string;
    comparison_value: string;
    reason: string;
    next_action: string;
    target_step_index: string;
    jump_count: string;
    max_jumps: string;
    max_jumps_reached: string;
    [key: string]: SchemaValueType;  // Index signature to make it compatible with SchemaObjectType
}

// Evaluation result that determines the next step in workflow
export interface EvaluationResult extends Omit<StepExecutionResult, 'outputs'> {
    conditionMet: string;  // ID of the condition that was met, or 'none'
    nextAction: 'continue' | 'jump' | 'end';
    targetStepIndex?: number;  // Only required when nextAction is 'jump'
    reason?: string;  // Optional explanation for the decision
    updatedState?: WorkflowVariable[];  // Optional updated workflow state
    outputs?: EvaluationOutputs;  // Typed outputs for evaluation steps
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
    maximum_jumps: number;  // Maximum number of times conditions will be checked before forcing continue
}

// Runtime step that includes execution functions
// NOTE: This interface has been removed in favor of utility functions in lib/workflow/workflowRuntime.ts
// export interface RuntimeWorkflowStep extends WorkflowStep {
//     // Execute the step and return its results
//     action: () => Promise<StepExecutionResult>;
//     // Get the text to display on the action button
//     actionButtonText: () => string;
//     // Check if the step can be executed
//     isDisabled: () => boolean;
//     // Get any validation errors that would prevent execution
//     getValidationErrors: () => string[];
// }

// Workflow variable extends base Variable with I/O type and required flag
export interface WorkflowVariable extends Omit<Variable, 'name'> {
    name: WorkflowVariableName;  // Reference name in workflow context
    io_type: 'input' | 'output' | 'evaluation';
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

// Helper functions to work with workflow state
export const getWorkflowInputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v => v.io_type === 'input') ?? [];
};

export const getWorkflowOutputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v => v.io_type === 'output') ?? [];
};

export const addWorkflowVariable = (
    workflow: Workflow,
    variable: WorkflowVariable
): Workflow => {
    return {
        ...workflow,
        state: [...(workflow.state ?? []), variable]
    };
};

// Complete workflow definition
export interface Workflow {
    workflow_id: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    error?: string;
    created_at?: string;
    updated_at?: string;
    // Combined state array containing both inputs and outputs
    state?: WorkflowVariable[];
    steps: WorkflowStep[];
}

// Default workflow with empty arrays
export const DEFAULT_WORKFLOW: Workflow = {
    workflow_id: '',
    name: 'Untitled Workflow',
    description: 'A new custom workflow',
    status: WorkflowStatus.DRAFT,
    steps: [],
    state: []
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
    workflow_id: "pubmed-research-assistant",
    name: "PubMed Research Assistant",
    description: "A workflow that converts questions into PubMed queries, evaluates results, and generates answers",
    status: WorkflowStatus.PUBLISHED,
    state: [
        {
            variable_id: "question-var",
            name: "question" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "The research question to be answered",
                is_array: false
            },
            io_type: "input",
            required: true
        },
        {
            variable_id: "notes-var",
            name: "notes" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Additional context or notes to help refine the search",
                is_array: false
            },
            io_type: "input",
            required: false
        },
        {
            variable_id: "final-answer-var",
            name: "final_answer" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Comprehensive answer based on PubMed results",
                is_array: false
            },
            io_type: "output"
        },
        {
            variable_id: "current-query-var",
            name: "current_query" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Current PubMed search query",
                is_array: false
            },
            io_type: "output"
        },
        {
            variable_id: "search-results-var",
            name: "search_results" as WorkflowVariableName,
            schema: {
                type: "object",
                description: "Current PubMed search results",
                is_array: true,
                fields: {
                    title: { type: "string", is_array: false },
                    abstract: { type: "string", is_array: false },
                    authors: { type: "string", is_array: true },
                    publication_date: { type: "string", is_array: false }
                }
            },
            io_type: "output"
        },
        {
            variable_id: "results-adequate-var",
            name: "results_adequate" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Whether current results are adequate (yes/no)",
                is_array: false
            },
            io_type: "output"
        },
        {
            variable_id: "refinement-notes-var",
            name: "refinement_notes" as WorkflowVariableName,
            schema: {
                type: "string",
                description: "Notes for query refinement if needed",
                is_array: false
            },
            io_type: "output"
        },
        {
            variable_id: "search-history-var",
            name: "search_history" as WorkflowVariableName,
            schema: {
                type: "object",
                description: "History of search iterations",
                is_array: true,
                fields: {
                    query: { type: "string", is_array: false },
                    results_count: { type: "number", is_array: false },
                    iteration: { type: "number", is_array: false }
                }
            },
            io_type: "output"
        }
    ],
    steps: [
        {
            step_id: "step1" as WorkflowStepId,
            workflow_id: "pubmed-research-assistant",
            label: "Generate PubMed Query",
            description: "Convert research question into an optimized PubMed search query",
            step_type: WorkflowStepType.ACTION,
            tool: {
                tool_id: "query-generator",
                tool_type: "llm",
                name: "PubMed Query Generator",
                description: "Converts natural language questions into PubMed search queries",
                signature: {
                    parameters: [
                        {
                            name: "question" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: true,
                            description: "Research question to convert"
                        },
                        {
                            name: "query" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: false,
                            description: "Previous query if refining"
                        },
                        {
                            name: "notes" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: false,
                            description: "Refinement notes from evaluation"
                        }
                    ],
                    outputs: [
                        {
                            name: "query" as ToolOutputName,
                            schema: { type: "string", is_array: false },
                            description: "Generated or refined PubMed query"
                        }
                    ]
                }
            } as Tool,
            prompt_template_id: "pubmed_query_generator",
            parameter_mappings: {
                question: "question" as WorkflowVariableName,
                query: "current_query" as WorkflowVariableName,
                notes: "refinement_notes" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                query: "current_query" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            sequence_number: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "step2" as WorkflowStepId,
            workflow_id: "pubmed-research-assistant",
            label: "Search PubMed",
            description: "Execute search query on PubMed",
            step_type: WorkflowStepType.ACTION,
            tool: {
                tool_id: "pubmed-search",
                tool_type: "search",
                name: "PubMed Search",
                description: "Search PubMed database with given query",
                signature: {
                    parameters: [
                        {
                            name: "query" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: true,
                            description: "PubMed search query"
                        }
                    ],
                    outputs: [
                        {
                            name: "search_results" as ToolOutputName,
                            schema: { type: "object", is_array: true },
                            description: "List of papers found"
                        }
                    ]
                }
            } as Tool,
            parameter_mappings: {
                query: "current_query" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                search_results: "search_results" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            sequence_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "step3" as WorkflowStepId,
            workflow_id: "pubmed-research-assistant",
            label: "Evaluate Results",
            description: "Evaluate if search results are sufficient to answer the question",
            step_type: WorkflowStepType.ACTION,
            tool: {
                tool_id: "results-evaluator",
                tool_type: "llm",
                name: "Search Results Evaluator",
                description: "Evaluates if search results are sufficient for the question",
                signature: {
                    parameters: [
                        {
                            name: "question" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: true,
                            description: "Original research question"
                        },
                        {
                            name: "search_results" as ToolParameterName,
                            schema: { type: "object", is_array: true },
                            required: true,
                            description: "Current search results"
                        }
                    ],
                    outputs: [
                        {
                            name: "is_sufficient" as ToolOutputName,
                            schema: { type: "string", is_array: false },
                            description: "Yes or No indicating if results are sufficient"
                        },
                        {
                            name: "notes" as ToolOutputName,
                            schema: { type: "string", is_array: false },
                            description: "Notes for query refinement if needed"
                        }
                    ]
                }
            } as Tool,
            prompt_template_id: "pubmed_results_evaluator",
            parameter_mappings: {
                question: "question" as WorkflowVariableName,
                search_results: "search_results" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                is_sufficient: "results_adequate" as WorkflowVariableName,
                notes: "refinement_notes" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            sequence_number: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "step4" as WorkflowStepId,
            workflow_id: "pubmed-research-assistant",
            label: "Check Results Sufficiency",
            description: "Determine whether to refine search or proceed to answer",
            step_type: WorkflowStepType.EVALUATION,
            evaluation_config: {
                conditions: [
                    {
                        condition_id: "needs-refinement",
                        variable: "results_adequate" as WorkflowVariableName,
                        operator: "equals",
                        value: "no",
                        target_step_index: 0
                    }
                ],
                default_action: "continue",
                maximum_jumps: 3
            },
            parameter_mappings: {},
            output_mappings: {},
            sequence_number: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            step_id: "step5" as WorkflowStepId,
            workflow_id: "pubmed-research-assistant",
            label: "Generate Answer",
            description: "Generate comprehensive answer based on search results",
            step_type: WorkflowStepType.ACTION,
            tool: {
                tool_id: "answer-generator",
                tool_type: "llm",
                name: "Answer Generator",
                description: "Generates comprehensive answer from PubMed results",
                signature: {
                    parameters: [
                        {
                            name: "question" as ToolParameterName,
                            schema: { type: "string", is_array: false },
                            required: true,
                            description: "Original research question"
                        },
                        {
                            name: "search_results" as ToolParameterName,
                            schema: { type: "object", is_array: true },
                            required: true,
                            description: "Final search results"
                        }
                    ],
                    outputs: [
                        {
                            name: "answer" as ToolOutputName,
                            schema: { type: "string", is_array: false },
                            description: "Comprehensive answer to the research question"
                        }
                    ]
                }
            } as Tool,
            prompt_template_id: "pubmed_answer_generator",
            parameter_mappings: {
                question: "question" as WorkflowVariableName,
                search_results: "search_results" as WorkflowVariableName
            } as Record<ToolParameterName, WorkflowVariableName>,
            output_mappings: {
                answer: "final_answer" as WorkflowVariableName
            } as Record<ToolOutputName, WorkflowVariableName>,
            sequence_number: 4,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ]
};

