export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export interface JobVariable {
    name: string;
    label?: string;
    description?: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
}

export interface JobStep {
    step_id: string;
    job_id: string;
    sequence_number: number;
    status: JobStatus;
    output_data?: any;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
}

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
    output_data?: any;
    steps: JobStep[];

    // Execution state
    execution_progress?: {
        current_step: number;
        total_steps: number;
    };
    live_output?: string;
}

export interface JobExecutionState {
    job_id: string;
    current_step_index: number;
    total_steps: number;
    is_paused: boolean;
    live_output: string;
    status: JobStatus;
}

export interface CreateJobRequest {
    workflow_id: string;
    name: string;
    description?: string;
    input_variables: JobVariable[];
} 