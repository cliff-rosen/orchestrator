import { SchemaValueType, Variable, VariableName } from './schema';
import { Tool } from './tools';

export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Job variable extends base Variable with required flag
export interface JobVariable extends Variable {
    required: boolean;
}

// Job step definition
export interface JobStep {
    step_id: string;
    job_id: string;
    sequence_number: number;
    status: JobStatus;
    output_data?: Record<VariableName, SchemaValueType>;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    tool?: Tool;
    prompt_template?: string;
    parameter_mappings: Record<VariableName, VariableName>;
    output_mappings: Record<VariableName, VariableName>;
}

// Complete job definition
export interface Job {
    job_id: string;
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
    output_data?: Record<VariableName, SchemaValueType>;
    steps: JobStep[];

    // Execution state
    execution_progress?: {
        current_step: number;
        total_steps: number;
    };
    live_output?: string;
}

// Job execution state
export interface JobExecutionState {
    job_id: string;
    current_step_index: number;
    total_steps: number;
    is_paused: boolean;
    live_output: string;
    status: JobStatus;
    step_results: StepExecutionResult[];
    variables: Record<VariableName, SchemaValueType>;
}

// Step execution result
export interface StepExecutionResult {
    step_id: string;
    status: JobStatus;
    output_data?: Record<VariableName, SchemaValueType>;
    error_message?: string;
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