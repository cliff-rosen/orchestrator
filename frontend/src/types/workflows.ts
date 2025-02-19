import { Tool } from './tools';
import { Schema, Variable, VariableName, ValueType } from './schema';

export enum WorkflowStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED'
}

export enum WorkflowStepType {
    ACTION = 'ACTION',
    INPUT = 'INPUT'
}

// Runtime step that includes execution functions
export interface RuntimeWorkflowStep extends WorkflowStep {
    action: () => Promise<void>;
    actionButtonText: () => string;
    isDisabled: () => boolean;
}

// Workflow variable extends base Variable with I/O type and required flag
export interface WorkflowVariable extends Variable {
    io_type: 'input' | 'output';
    // Required flag only applies to inputs and defaults to true
    required?: boolean;
}

// Helper to create a workflow variable
export const createWorkflowVariable = (
    variable_id: string,
    schema: Schema,
    io_type: 'input' | 'output',
    // required parameter is only used for inputs and defaults to true
    required: boolean = true
): WorkflowVariable => ({
    variable_id,
    schema,
    io_type,
    // only set required flag for input variables
    ...(io_type === 'input' ? { required } : {})
});

// Workflow step definition
export interface WorkflowStep {
    step_id: string;
    workflow_id: string;
    label: string;
    description: string;
    step_type: WorkflowStepType;
    tool?: Tool;
    tool_id?: string;
    prompt_template?: string;
    // Maps tool parameter names to workflow variable names
    parameter_mappings: Record<VariableName, VariableName>;
    // Maps tool output names to workflow variable names
    output_mappings: Record<VariableName, VariableName>;
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

// Helper function to create an array schema
export const createArraySchema = (name: string, itemType: ValueType, description?: string): Schema => ({
    name,
    type: itemType,  // The base type of the items
    description,
    array_type: true  // This indicates it's an array of itemType
});

// Helper function to create a basic schema
export const createBasicSchema = (name: string, type: ValueType, description?: string): Schema => ({
    name,
    type,
    description,
    array_type: false
});

