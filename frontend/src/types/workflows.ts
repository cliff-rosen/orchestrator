import { Tool, ToolParameterName, ToolOutputName } from './tools';
import { Schema, Variable, ValueType, SchemaValueType } from './schema';

export enum WorkflowStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED'
}

export enum WorkflowStepType {
    ACTION = 'ACTION',
    INPUT = 'INPUT'
}

// Type-safe workflow variable references
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Execution result for runtime steps
export interface StepExecutionResult {
    success: boolean;
    error?: string;
    outputs?: Record<WorkflowVariableName, SchemaValueType>;
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

