import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, StepExecutionResult, JobId, JobStepId, JobStep } from '../types/jobs';
import { WorkflowVariable, WorkflowVariableName, WorkflowStepType, Workflow, WorkflowStatus, WorkflowStep, WorkflowStepId, getWorkflowInputs, EvaluationResult, StepExecutionResult as WorkflowStepResult } from '../types/workflows';
import { SchemaValueType, } from '../types/schema';
import { useWorkflows } from './WorkflowContext';
import { JobEngine, JobState } from '../lib/job/jobEngine';

interface JobError {
    message: string;
    code?: string;
    details?: string;
}

interface JobsContextState {
    jobs: Job[];
    currentJob?: Job;
    executionState?: JobExecutionState;
    isLoading: boolean;
    error?: JobError;
    inputValues: Record<string, any>;
    inputErrors: Record<string, string>;
}

interface JobsContextValue extends JobsContextState {
    // Job Management
    loadJobs: () => Promise<void>;
    loadJob: (jobId: string) => Promise<void>;
    getJob: (jobId: string) => Promise<Job>;
    createJob: (request: CreateJobRequest) => Promise<Job>;
    deleteJob: (jobId: string) => Promise<void>;

    // Job Execution
    runJob: () => Promise<void>;
    cancelJob: (jobId: string) => Promise<void>;
    resetJob: (jobId: string) => Promise<Job>;

    // Input Management
    setInputValue: (variableId: string, value: any) => void;
    validateInputs: () => boolean;
    clearInputs: () => void;
    areInputsValid: () => boolean;

    // State Management
    setCurrentJob: (job: Job) => void;
    resetCurrentJob: () => void;
    clearError: () => void;
}

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

// Helper function to convert Job to Workflow format
const jobToWorkflow = (job: Job, inputs: WorkflowVariable[], outputs: WorkflowVariable[]): Workflow => {
    // Convert JobStepId to WorkflowStepId (they're branded types)
    const convertedSteps = job.steps.map(step => {
        // Only include properties that exist in WorkflowStep
        const workflowStep: WorkflowStep = {
            step_id: `${step.step_id}` as WorkflowStepId,
            workflow_id: job.workflow_id,
            label: step.label,
            description: step.description,
            step_type: step.step_type,
            sequence_number: step.sequence_number,
            parameter_mappings: step.parameter_mappings || {},
            output_mappings: step.output_mappings || {},
            tool: step.tool,
            tool_id: step.tool_id,
            prompt_template_id: step.prompt_template_id,
            evaluation_config: step.evaluation_config,
            created_at: step.started_at || new Date().toISOString(),
            updated_at: step.completed_at || new Date().toISOString()
        };
        return workflowStep;
    });

    // Combine inputs and outputs into a single state array
    // Convert any 'evaluation' io_type to 'output' to avoid API validation errors
    const state = [...inputs, ...outputs].map(variable => {
        if (variable.io_type === 'evaluation') {
            return {
                ...variable,
                io_type: 'output' as const
            };
        }
        return variable;
    });

    // Only include properties that exist in Workflow
    return {
        workflow_id: job.workflow_id,
        name: job.name,
        description: job.description,
        status: WorkflowStatus.DRAFT,
        steps: convertedSteps,
        state: state
    };
};

// Helper function to convert workflow step to job step
const workflowStepToJobStep = (step: WorkflowStep, jobId: JobId): JobStep => {
    // Convert WorkflowStepId to JobStepId (they're branded types)
    const jobStepId = step.step_id.replace('workflow-', '') as JobStepId;

    return {
        step_id: jobStepId,
        job_id: jobId,
        label: step.label,
        description: step.description,
        step_type: step.step_type,
        sequence_number: step.sequence_number,
        parameter_mappings: step.parameter_mappings,
        output_mappings: step.output_mappings,
        tool: step.tool,
        tool_id: step.tool_id,
        prompt_template_id: step.prompt_template_id,
        evaluation_config: step.evaluation_config,
        status: JobStatus.RUNNING,
        error_message: undefined,
        output_data: undefined,
        started_at: undefined,
        completed_at: undefined
    };
};

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [state, setState] = useState<JobsContextState>({
        jobs: [],
        isLoading: false,
        inputValues: {},
        inputErrors: {},
    });

    const { workflows } = useWorkflows();

    // Persist current job in sessionStorage
    useEffect(() => {
        if (state.currentJob) {
            sessionStorage.setItem('currentJob', JSON.stringify(state.currentJob));
        }
    }, [state.currentJob]);

    // Restore current job from sessionStorage
    useEffect(() => {
        const savedJob = sessionStorage.getItem('currentJob');
        if (savedJob) {
            setState(prev => ({
                ...prev,
                currentJob: JSON.parse(savedJob)
            }));
        }
    }, []);

    // Clear session storage when resetting current job
    const resetCurrentJob = useCallback(() => {
        setState(prev => ({
            ...prev,
            currentJob: undefined,
            inputValues: {},
            inputErrors: {}
        }));
        sessionStorage.removeItem('currentJob');
    }, []);

    // Job list management
    const loadJobs = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Just return the jobs from state
            setState(prev => ({ ...prev, isLoading: false }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to load jobs',
                    code: 'JOBS_LOAD_ERROR'
                }
            }));
        }
    }, []);

    const loadJob = useCallback(async (jobId: string): Promise<void> => {
        //console.log('loadJob', jobId);
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            //console.log('loadJob', jobId, state.jobs);
            const job = state.jobs.find(j => j.job_id === jobId);
            if (!job) {
                const error: JobError = {
                    message: 'Job not found',
                    code: 'JOB_NOT_FOUND',
                    details: `Could not find job with ID: ${jobId}`
                };
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error,
                    currentJob: undefined
                }));
                // Redirect to jobs manager after a short delay to show the error
                console.log('loadJob error', error);
                //throw new Error(error.message);
            }
            //console.log('loadJob found job', job);
            setState(prev => ({ ...prev, currentJob: job, isLoading: false }));
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to load job',
                code: 'JOB_LOAD_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError,
                currentJob: undefined
            }));
            console.log('loadJob error cought', jobError);
            //throw error;
        }
    }, [navigate, state.jobs]);

    /**
     * Get a job by ID
     */
    const getJob = useCallback(async (jobId: string): Promise<Job> => {
        const job = state.jobs.find(j => j.job_id === jobId);

        if (!job) {
            const jobError: JobError = {
                message: `Job with ID ${jobId} not found`,
                code: 'JOB_NOT_FOUND',
                details: `Requested job ID: ${jobId}`
            };

            setState(prev => ({
                ...prev,
                error: jobError
            }));

            throw new Error(`Job with ID ${jobId} not found`);
        }

        return job;
    }, [state.jobs]);

    const createJob = useCallback(async (request: CreateJobRequest): Promise<Job> => {
        try {
            // Generate a unique job ID
            const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Get the workflow
            const workflow = workflows?.find(w => w.workflow_id === request.workflow_id);
            if (!workflow) {
                throw new Error(`Workflow with ID ${request.workflow_id} not found`);
            }

            // Create input variables from workflow inputs
            const inputVariables = workflow.state
                ?.filter(v => v.io_type === 'input')
                .map(v => ({
                    variable_id: v.variable_id,
                    name: v.name,
                    description: v.description,
                    schema: v.schema,
                    required: true
                })) || [];

            // Create job steps from workflow steps
            const jobSteps = workflow.steps.map((step, index) => workflowStepToJobStep(step, jobId as JobId));

            // Create the new job
            const newJob: Job = {
                job_id: jobId as JobId,
                workflow_id: request.workflow_id,
                user_id: 'current_user', // This would come from auth in a real app
                name: request.name || workflow.name,
                description: request.description || workflow.description,
                status: JobStatus.PENDING,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                input_variables: inputVariables,
                steps: jobSteps,
                state: workflow.state || [] // Initialize with workflow state
            };

            // Update state with new job
            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, newJob],
                currentJob: newJob
            }));

            return newJob;
        } catch (error) {
            console.error('Error creating job:', error);
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to create job',
                code: 'JOB_CREATION_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({ ...prev, error: jobError }));
            throw error;
        }
    }, [workflows]);

    const deleteJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.filter(j => j.job_id !== jobId),
            currentJob: prev.currentJob?.job_id === jobId ? undefined : prev.currentJob
        }));
    }, []);

    /**
     * Validates all input values before running a job
     */
    const validateInputs = useCallback((): boolean => {
        if (!state.currentJob?.input_variables) {
            return true; // No inputs to validate
        }

        const newErrors: Record<string, string> = {};
        let isValid = true;

        // Check each required input
        state.currentJob.input_variables.forEach(variable => {
            if (variable.required &&
                (state.inputValues[variable.variable_id] === undefined ||
                    state.inputValues[variable.variable_id] === null ||
                    state.inputValues[variable.variable_id] === '')) {
                newErrors[variable.variable_id] = 'This field is required';
                isValid = false;
            }
        });

        // Update error state if there are any errors
        if (Object.keys(newErrors).length > 0) {
            setState(prev => ({
                ...prev,
                inputErrors: newErrors
            }));
        }

        return isValid;
    }, [state.currentJob, state.inputValues]);

    /**
     * Prepares input variables from the current input values
     */
    const prepareInputVariables = useCallback((): Record<WorkflowVariableName, SchemaValueType> => {
        const variables: Record<WorkflowVariableName, SchemaValueType> = {};

        if (!state.currentJob?.input_variables) return variables;

        state.currentJob.input_variables.forEach(variable => {
            if (variable.name && state.inputValues[variable.variable_id] !== undefined) {
                variables[variable.name] = state.inputValues[variable.variable_id];
            }
        });

        return variables;
    }, [state.currentJob, state.inputValues]);

    const runJob = useCallback(async (): Promise<void> => {
        try {
            // Validate inputs first
            if (!validateInputs()) {
                return;
            }

            // Get current job
            const job = state.currentJob;
            if (!job) {
                throw new Error('No job selected');
            }

            // Reset any previous error
            setState(prev => ({ ...prev, error: undefined }));

            // Prepare input variables
            const inputVariables = prepareInputVariables();

            // Initialize job with input variables and update status to running
            const initialJob = JobEngine.initializeJobWithInputs({
                ...job,
                status: JobStatus.RUNNING,
                started_at: new Date().toISOString(),
                execution_progress: {
                    current_step: 0,
                    total_steps: job.steps.length
                },
                state: job.state || [] // Ensure state property exists
            }, inputVariables);

            // Update UI
            const initialExecutionState: JobExecutionState = {
                job_id: initialJob.job_id,
                current_step_index: 0,
                total_steps: initialJob.steps.length,
                is_paused: false,
                live_output: 'Starting job execution...',
                status: JobStatus.RUNNING,
                step_results: []
            };

            setState(prev => ({
                ...prev,
                currentJob: initialJob,
                executionState: initialExecutionState
            }));

            // Prepare initial job state
            const initialJobState: JobState = {
                stepResults: [],
                currentStepIndex: 0
            };

            // Execute job steps
            const finalJob = await executeJobWithEngine(initialJob, initialJobState);

            // Update UI with completed job
            setState(prev => ({
                ...prev,
                currentJob: finalJob,
                executionState: undefined
            }));

            // Navigate to job details page
            navigate(`/jobs/${finalJob.job_id}`);
        } catch (error) {
            console.error('Error running job:', error);
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to run job',
                code: 'JOB_EXECUTION_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                error: jobError,
                currentJob: prev.currentJob ? {
                    ...prev.currentJob,
                    status: JobStatus.FAILED,
                    error_message: jobError.message
                } : undefined
            }));
        }
    }, [state.currentJob, state.inputValues, state.inputErrors, navigate, validateInputs, prepareInputVariables]);

    /**
     * Execute a job using the JobEngine
     * This is a much simpler implementation than the previous executeJobSteps
     */
    const executeJobWithEngine = async (
        job: Job,
        initialState: JobState
    ): Promise<Job> => {
        let currentJob = job;
        let currentState = initialState;

        while (currentState.currentStepIndex < job.steps.length) {
            const { updatedState, result, nextStepIndex } = await JobEngine.executeStep(
                currentJob,
                currentState.currentStepIndex,
                currentState
            );
            console.log('executeJobWithEngine', {
                updatedState,
                result,
                nextStepIndex
            });
            // Update execution state in UI
            setState(prev => ({
                ...prev,
                executionState: {
                    ...prev.executionState!,
                    current_step_index: nextStepIndex,
                    step_results: updatedState.stepResults,
                    live_output: `Step ${currentState.currentStepIndex + 1} completed. Moving to step ${nextStepIndex + 1}...`
                }
            }));

            // Update job with step result
            currentJob = JobEngine.updateJobWithStepResult(
                currentJob,
                currentState.currentStepIndex,
                result,
                nextStepIndex
            );

            // Update state for next iteration
            currentState = updatedState;

            // Update UI with current job
            setState(prev => ({
                ...prev,
                currentJob
            }));
        }

        return currentJob;
    };

    const cancelJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => {
            const job = prev.jobs.find(j => j.job_id === jobId);
            if (!job) return prev;

            const cancelledJob = {
                ...job,
                status: JobStatus.FAILED,
                error_message: 'Job cancelled by user',
                completed_at: new Date().toISOString()
            };

            return {
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? cancelledJob : j),
                currentJob: prev.currentJob?.job_id === jobId ? cancelledJob : prev.currentJob,
                error: {
                    message: 'Job cancelled by user',
                    code: 'JOB_CANCELLED'
                }
            };
        });
    }, []);

    /**
     * Reset a job to its initial state
     */
    const resetJob = useCallback(async (jobId: string): Promise<Job> => {
        const job = await getJob(jobId);

        // Reset job to pending state
        const resetJob: Job = {
            ...job,
            status: JobStatus.PENDING,
            started_at: undefined,
            completed_at: undefined,
            error_message: undefined,
            execution_progress: {
                current_step: 0,
                total_steps: job.steps.length
            },
            steps: job.steps.map(step => ({
                ...step,
                status: JobStatus.PENDING,
                started_at: undefined,
                completed_at: undefined,
                error_message: undefined,
                output_data: undefined
            })),
            // Preserve the state but reset any output variables
            state: job.state?.filter(v => v.io_type === 'input') || []
        };

        // Update state
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.map(j => j.job_id === jobId ? resetJob : j),
            currentJob: prev.currentJob?.job_id === jobId ? resetJob : prev.currentJob
        }));

        return resetJob;
    }, [getJob]);

    // Input Management
    const setInputValue = useCallback((variableId: string, value: any) => {
        setState(prev => {
            const newInputValues = {
                ...prev.inputValues,
                [variableId]: value
            };

            // Clear error when value is set
            const newInputErrors = { ...prev.inputErrors };
            delete newInputErrors[variableId];

            // Remove the real-time validation that's causing the infinite loop
            // We'll only validate when the form is submitted

            return {
                ...prev,
                inputValues: newInputValues,
                inputErrors: newInputErrors
            };
        });
    }, []);

    const clearInputs = useCallback(() => {
        setState(prev => ({
            ...prev,
            inputValues: {},
            inputErrors: {}
        }));
    }, []);

    const areInputsValid = useCallback(() => {
        if (!state.currentJob?.workflow_id) return false;

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob?.workflow_id);
        if (!workflow) return false;

        // Use getWorkflowInputs helper to get inputs from workflow state
        const workflowInputs = getWorkflowInputs(workflow);

        return workflowInputs.every((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (input.schema.type === 'boolean') return true;
            if (input.schema.type === 'file') return !!value?.file_id;
            return value !== undefined && value !== '';
        });
    }, [state.currentJob, state.inputValues, workflows]);

    // State management helpers
    const setCurrentJob = useCallback((job: Job) => {
        setState(prev => ({
            ...prev,
            currentJob: job
        }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: undefined }));
    }, []);

    // Context provider value
    const value: JobsContextValue = {
        ...state,
        loadJobs,
        loadJob,
        getJob,
        createJob,
        deleteJob,
        runJob,
        cancelJob,
        resetJob,
        setInputValue,
        clearInputs,
        validateInputs,
        areInputsValid,
        setCurrentJob,
        resetCurrentJob: resetCurrentJob,
        clearError
    };

    return (
        <JobsContext.Provider value={value}>
            {children}
        </JobsContext.Provider>
    );
};

export const useJobs = () => {
    const context = useContext(JobsContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobsProvider');
    }
    return context;
}; 