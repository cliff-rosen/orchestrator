import { SchemaValueType, Variable } from './schema';
import { Tool, ToolParameterName, ToolOutputName } from './tools';
import { WorkflowVariableName, StepExecutionResult as WorkflowStepResult } from './workflows';

export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Branded types for type-safe job references
export type JobId = string & { readonly __brand: unique symbol };
export type JobStepId = string & { readonly __brand: unique symbol };

// Job variable extends base Variable with required flag
export interface JobVariable extends Omit<Variable, 'name'> {
    name: WorkflowVariableName;  // Must match a workflow variable name
    required: boolean;
}

// Job step definition
export interface JobStep {
    step_id: JobStepId;
    job_id: JobId;
    sequence_number: number;
    status: JobStatus;
    output_data?: Record<WorkflowVariableName, SchemaValueType>;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    tool?: Tool;
    // Only present for LLM tools
    prompt_template?: string;
    // Maps tool parameters to workflow variables
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    // Maps tool outputs to workflow variables
    output_mappings: Record<ToolOutputName, WorkflowVariableName>;
}

// Complete job definition
export interface Job {
    job_id: JobId;
    workflow_id: string;
    user_id: string;
    name: string;
    description?: string;
    status: JobStatus;
    error_message?: string;

    // Time tracking
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;

    // Data
    input_variables: JobVariable[];
    output_data?: Record<WorkflowVariableName, SchemaValueType>;
    steps: JobStep[];

    // Execution state
    execution_progress?: {
        current_step: number;
        total_steps: number;
        is_paused?: boolean;  
    };
    live_output?: string;
}

// Job execution state
export interface JobExecutionState {
    job_id: JobId;
    current_step_index: number;
    total_steps: number;
    is_paused: boolean;
    live_output: string;
    status: JobStatus;
    step_results: StepExecutionResult[];
    // Runtime variable values
    variables: Record<WorkflowVariableName, SchemaValueType>;
}

// Step execution result (aligned with workflow step result)
export interface StepExecutionResult extends WorkflowStepResult {
    step_id: JobStepId;
    started_at: string;
    completed_at?: string;
}

// Create job request
export interface CreateJobRequest {
    workflow_id: string;
    name: string;
    description?: string;
    input_variables: JobVariable[];
}

// Validation utilities
export const isJobComplete = (job: Job): job is Job & { status: JobStatus.COMPLETED } => {
    return job.status === JobStatus.COMPLETED;
};

export const isJobFailed = (job: Job): job is Job & { status: JobStatus.FAILED; error_message: string } => {
    return job.status === JobStatus.FAILED;
};

export const isJobRunning = (job: Job): job is Job & { status: JobStatus.RUNNING; started_at: string } => {
    return job.status === JobStatus.RUNNING;
};

export const isStepComplete = (step: JobStep): step is JobStep & { status: JobStatus.COMPLETED; completed_at: string } => {
    return step.status === JobStatus.COMPLETED;
};

export const isStepFailed = (step: JobStep): step is JobStep & { status: JobStatus.FAILED; error_message: string } => {
    return step.status === JobStatus.FAILED;
}; 