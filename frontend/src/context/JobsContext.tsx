import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable, StepExecutionResult, JobId, JobStepId, JobStep } from '../types/jobs';
import { WorkflowVariable, WorkflowVariableName, WorkflowStepType, Workflow, WorkflowStatus, WorkflowStep, WorkflowStepId, getWorkflowInputs } from '../types/workflows';
import { SchemaValueType, ValueType } from '../types/schema';
import { useWorkflows } from './WorkflowContext';
import { toolApi } from '../lib/api/toolApi';
import { WorkflowEngine } from '../lib/workflow/workflowEngine';

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
    resetJob: (jobId: string) => Promise<void>;

    // Input Management
    setInputValue: (variableId: string, value: any) => void;
    validateInputs: () => boolean;
    clearInputs: () => void;
    areInputsValid: () => boolean;

    // State Management
    setCurrentJob: (job?: Job) => void;
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
            step_id: `workflow-${step.step_id}` as WorkflowStepId,
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
    const state = [...inputs, ...outputs];

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
        setState(prev => ({ ...prev, currentJob: undefined }));
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
        console.log('loadJob', jobId);
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            console.log('loadJob', jobId, state.jobs);
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
            console.log('loadJob found job', job);
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

    const getJob = useCallback(async (jobId: string): Promise<Job> => {
        const job = state.jobs.find(j => j.job_id === jobId);
        if (!job) {
            const error: JobError = {
                message: 'Job not found',
                code: 'JOB_NOT_FOUND',
                details: `Could not find job with ID: ${jobId}`
            };
            setState(prev => ({
                ...prev,
                error
            }));
            throw new Error(error.message);
        }
        return job;
    }, [state.jobs]);

    const createJob = useCallback(async (request: CreateJobRequest): Promise<Job> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Create a new job with initial state
            const workflow = workflows?.find(w => w.workflow_id === request.workflow_id);
            if (!workflow) {
                const error: JobError = {
                    message: 'Workflow not found',
                    code: 'WORKFLOW_NOT_FOUND',
                    details: `Could not find workflow with ID: ${request.workflow_id}`
                };
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error
                }));
                throw new Error(error.message);
            }

            const jobId = `job-${Date.now()}` as JobId;
            const jobSteps: JobStep[] = workflow.steps.map((step, index) => ({
                step_id: `${jobId}_step_${index}` as JobStepId,
                job_id: jobId as JobId,
                label: step.label,
                description: step.description,
                step_type: step.step_type,
                sequence_number: index,
                status: JobStatus.PENDING,
                tool: step.tool,
                tool_id: step.tool_id,
                prompt_template_id: step.prompt_template_id,
                parameter_mappings: step.parameter_mappings,
                output_mappings: step.output_mappings,
                evaluation_config: step.evaluation_config
            }));

            // Use getWorkflowInputs helper to get inputs from workflow state
            const workflowInputs = getWorkflowInputs(workflow);

            const newJob: Job = {
                job_id: jobId,
                workflow_id: request.workflow_id,
                name: request.name,
                description: request.description || '',
                status: JobStatus.PENDING,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: 'default',
                input_variables: workflowInputs.map((i) => ({
                    ...i,
                    required: i.required || true,
                })) || [],
                steps: jobSteps
            };

            console.log('createJob will add new job:', newJob);
            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, newJob],
                currentJob: newJob,
                isLoading: false
            }));

            return newJob;
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to create job',
                code: 'JOB_CREATE_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError
            }));
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

    const runJob = useCallback(async (): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            console.log('JobsContext.tsx runJob');
            const job = state.currentJob;
            if (!job) {
                const error: JobError = {
                    message: 'No job selected',
                    code: 'NO_JOB_SELECTED'
                };
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error
                }));
                throw new Error(error.message);
            }

            // Prepare input variables from inputValues state
            const preparedInputVariables = job.input_variables.map(variable => ({
                ...variable,
                value: state.inputValues[variable.variable_id]
            }));

            // Reset input values and errors before starting
            setState(prev => ({
                ...prev,
                inputValues: {},
                inputErrors: {}
            }));

            // Update job with input variables and set initial running state
            const updatedJob = {
                ...job,
                status: JobStatus.RUNNING,
                started_at: new Date().toISOString(),
                input_variables: preparedInputVariables,
                execution_progress: {
                    current_step: 0,
                    total_steps: job.steps.length
                },
                steps: job.steps.map(step => ({
                    ...step,
                    status: step.sequence_number === 0 ? JobStatus.RUNNING : JobStatus.PENDING,
                    started_at: step.sequence_number === 0 ? new Date().toISOString() : undefined,
                    output_data: step.status === JobStatus.COMPLETED ? step.output_data : undefined
                }))
            };

            // Initialize execution state
            const initialExecutionState: JobExecutionState = {
                job_id: job.job_id as JobId,
                current_step_index: 0,
                total_steps: job.steps.length,
                is_paused: false,
                live_output: 'Initializing job execution...',
                status: JobStatus.RUNNING,
                step_results: [],
                variables: {}
            };

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === job.job_id ? updatedJob : j),
                currentJob: updatedJob,
                executionState: initialExecutionState,
                isLoading: false // Set to false as we're now in running state
            }));

            // Execute steps using WorkflowEngine
            let currentStep = 0;
            const jobOutputs: Record<WorkflowVariableName, SchemaValueType> = {};
            const stepResults: StepExecutionResult[] = [];

            while (currentStep < updatedJob.steps.length) {
                try {
                    // Update current step status to RUNNING and previous steps to COMPLETED
                    setState(prev => {
                        if (!prev.currentJob) return prev;

                        // Ensure we have steps
                        if (!prev.currentJob.steps || prev.currentJob.steps.length === 0) {
                            return {
                                ...prev,
                                executionState: {
                                    ...prev.executionState!,
                                    live_output: 'Error: No steps found in job'
                                }
                            };
                        }

                        const updatedSteps = prev.currentJob.steps.map((step, idx) => {
                            if (idx === currentStep) {
                                return {
                                    ...step,
                                    status: JobStatus.RUNNING,
                                    started_at: new Date().toISOString()
                                };
                            } else if (idx < currentStep) {
                                return {
                                    ...step,
                                    status: JobStatus.COMPLETED
                                };
                            }
                            return step;
                        });

                        const updatedJob = {
                            ...prev.currentJob,
                            execution_progress: {
                                current_step: currentStep,
                                total_steps: updatedSteps.length
                            },
                            steps: updatedSteps
                        };

                        // Get current step label safely
                        const currentStepLabel = updatedJob.steps[currentStep]?.label || 'Unknown step';

                        return {
                            ...prev,
                            jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                            currentJob: updatedJob,
                            executionState: {
                                ...prev.executionState!,
                                current_step_index: currentStep,
                                live_output: `Starting step ${currentStep + 1} of ${updatedJob.steps.length}: ${currentStepLabel}...`
                            }
                        };
                    });

                    // Convert input variables to WorkflowVariable format
                    const workflowInputs = preparedInputVariables.map(v => ({
                        ...v,
                        io_type: 'input' as const
                    }));

                    // Convert job outputs to WorkflowVariable format
                    const workflowOutputs = Object.entries(jobOutputs).map(([name, value]) => ({
                        name: name as WorkflowVariableName,
                        variable_id: name,
                        value,
                        io_type: 'output' as const,
                        schema: { type: typeof value as ValueType, is_array: Array.isArray(value) }
                    }));

                    // Create workflow representation for this step
                    const stepWorkflow = jobToWorkflow(
                        state.currentJob!, // Use the latest state
                        workflowInputs,
                        workflowOutputs
                    );

                    // Execute the step
                    const stepResult = await WorkflowEngine.executeStep(
                        stepWorkflow,
                        currentStep,
                        (action) => {
                            setState(prev => {
                                const currentJob = prev.currentJob;
                                if (!currentJob) return prev;

                                // If the action updates steps, convert workflow steps to job steps
                                if (action.type === 'UPDATE_WORKFLOW' && action.payload.workflowUpdates?.steps) {
                                    try {
                                        const updatedSteps = action.payload.workflowUpdates.steps.map(step =>
                                            workflowStepToJobStep(step, currentJob.job_id)
                                        );

                                        const updatedJob = {
                                            ...currentJob,
                                            steps: updatedSteps
                                        };

                                        return {
                                            ...prev,
                                            jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                                            currentJob: updatedJob
                                        };
                                    } catch (error) {
                                        console.error('Error updating steps:', error);
                                        return prev;
                                    }
                                }

                                // If the action updates state, update the live output
                                if (action.type === 'UPDATE_STATE' ||
                                    (action.type === 'UPDATE_WORKFLOW' && action.payload.workflowUpdates?.state)) {
                                    try {
                                        // Make sure we have the current step
                                        if (!currentJob.steps || currentJob.steps.length <= currentStep) {
                                            return {
                                                ...prev,
                                                executionState: {
                                                    ...prev.executionState!,
                                                    live_output: `Executing step ${currentStep + 1}...`
                                                }
                                            };
                                        }

                                        return {
                                            ...prev,
                                            executionState: {
                                                ...prev.executionState!,
                                                live_output: `Executing step ${currentStep + 1}: ${currentJob.steps[currentStep]?.label || 'Unknown step'}...`
                                            }
                                        };
                                    } catch (error) {
                                        console.error('Error updating state:', error);
                                        return prev;
                                    }
                                }

                                return prev;
                            });
                        }
                    );

                    // Store step result
                    if (state.currentJob && state.currentJob.steps && state.currentJob.steps[currentStep]) {
                        stepResults.push({
                            ...stepResult,
                            step_id: state.currentJob.steps[currentStep].step_id,
                            started_at: state.currentJob.steps[currentStep].started_at || new Date().toISOString(),
                            completed_at: new Date().toISOString()
                        });
                    } else {
                        // Fallback if we can't find the step
                        stepResults.push({
                            ...stepResult,
                            step_id: `unknown-step-${currentStep}` as JobStepId,
                            started_at: new Date().toISOString(),
                            completed_at: new Date().toISOString()
                        });
                    }

                    // Update job outputs
                    if (stepResult.outputs) {
                        const step = state.currentJob?.steps?.[currentStep];
                        if (step?.output_mappings) {
                            Object.entries(step.output_mappings).forEach(([outputName, variableName]) => {
                                const outputs = stepResult.outputs as Record<string, SchemaValueType>;
                                if (outputs && outputName in outputs) {
                                    jobOutputs[variableName as WorkflowVariableName] = outputs[outputName];
                                }
                            });

                            // Update step status to COMPLETED and add output data
                            setState(prev => {
                                if (!prev.currentJob) return prev;

                                try {
                                    // Ensure we have steps
                                    if (!prev.currentJob.steps || prev.currentJob.steps.length <= currentStep) {
                                        return {
                                            ...prev,
                                            executionState: {
                                                ...prev.executionState!,
                                                live_output: 'Error: Step not found when updating output data'
                                            }
                                        };
                                    }

                                    const updatedSteps = prev.currentJob.steps.map((s, idx) => {
                                        if (idx === currentStep) {
                                            return {
                                                ...s,
                                                status: JobStatus.COMPLETED,
                                                completed_at: new Date().toISOString(),
                                                output_data: stepResult.outputs
                                            };
                                        }
                                        return s;
                                    });

                                    const updatedJob = {
                                        ...prev.currentJob,
                                        steps: updatedSteps
                                    };

                                    // Format output for display
                                    let outputDisplay = 'No outputs';
                                    try {
                                        outputDisplay = Object.entries(jobOutputs)
                                            .map(([key, value]) => {
                                                const displayValue = typeof value === 'object'
                                                    ? JSON.stringify(value, null, 2)
                                                    : String(value);
                                                return `${key}: ${displayValue}`;
                                            })
                                            .join('\n');

                                        if (Object.keys(jobOutputs).length === 0) {
                                            outputDisplay = 'No outputs mapped';
                                        }
                                    } catch (error) {
                                        console.error('Error formatting outputs:', error);
                                        outputDisplay = 'Error formatting outputs';
                                    }

                                    return {
                                        ...prev,
                                        jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                                        currentJob: updatedJob,
                                        executionState: {
                                            ...prev.executionState!,
                                            step_results: [...stepResults],
                                            live_output: `Step ${currentStep + 1} completed successfully.\n\nOutputs:\n${outputDisplay}`
                                        }
                                    };
                                } catch (error) {
                                    console.error('Error updating step status:', error);
                                    return {
                                        ...prev,
                                        executionState: {
                                            ...prev.executionState!,
                                            live_output: `Step ${currentStep + 1} completed but encountered an error updating status: ${error}`
                                        }
                                    };
                                }
                            });
                        }
                    }

                    // Check if job was cancelled or failed
                    const currentJobState = state.jobs.find(j => j.job_id === job.job_id);
                    if (currentJobState?.status === JobStatus.FAILED) {
                        setState(prev => ({
                            ...prev,
                            executionState: {
                                ...prev.executionState!,
                                status: JobStatus.FAILED,
                                live_output: 'Job execution cancelled or failed.'
                            }
                        }));
                        break;
                    }

                    // Get next step from WorkflowEngine
                    if (!state.currentJob || !state.currentJob.steps) {
                        throw new Error('Job or steps not found when determining next step');
                    }

                    const { nextStepIndex, updatedWorkflow } = WorkflowEngine.getNextStepIndex(
                        jobToWorkflow(state.currentJob, workflowInputs, workflowOutputs),
                        currentStep
                    );

                    if (nextStepIndex === currentStep) {
                        // If we're not progressing, something went wrong
                        throw new Error('Workflow execution stuck - no progress being made');
                    }

                    // Update to show we're moving to the next step
                    if (nextStepIndex < state.currentJob.steps.length) {
                        const nextStep = state.currentJob.steps[nextStepIndex];
                        setState(prev => ({
                            ...prev,
                            executionState: {
                                ...prev.executionState!,
                                live_output: `Moving to step ${nextStepIndex + 1}: ${nextStep?.label || 'Unknown step'}...`
                            }
                        }));
                    }

                    currentStep = nextStepIndex;

                } catch (error) {
                    const jobError: JobError = {
                        message: error instanceof Error ? error.message : `Error executing step ${currentStep}`,
                        code: 'STEP_EXECUTION_ERROR',
                        details: error instanceof Error ? error.stack : undefined
                    };

                    // Update the failed step status
                    setState(prev => {
                        if (!prev.currentJob) return prev;

                        const updatedSteps = prev.currentJob.steps.map((s, idx) => {
                            if (idx === currentStep) {
                                return {
                                    ...s,
                                    status: JobStatus.FAILED,
                                    error_message: jobError.message,
                                    completed_at: new Date().toISOString()
                                };
                            }
                            return s;
                        });

                        const updatedJob = {
                            ...prev.currentJob,
                            status: JobStatus.FAILED,
                            error_message: jobError.message,
                            steps: updatedSteps
                        };

                        return {
                            ...prev,
                            jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                            currentJob: updatedJob,
                            error: jobError,
                            executionState: {
                                ...prev.executionState!,
                                status: JobStatus.FAILED,
                                live_output: `Error in step ${currentStep + 1}: ${jobError.message}`
                            },
                            isLoading: false
                        };
                    });
                    break;
                }
            }

            // Update final job state
            setState(prev => {
                const finalJob = prev.jobs.find(j => j.job_id === job.job_id);
                if (!finalJob) return prev;

                // Ensure we have steps
                if (!finalJob.steps || finalJob.steps.length === 0) {
                    return {
                        ...prev,
                        executionState: {
                            ...prev.executionState!,
                            live_output: 'Error: No steps found in job when finalizing'
                        }
                    };
                }

                const isCompleted = currentStep >= finalJob.steps.length;
                const completedJob = {
                    ...finalJob,
                    status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED,
                    completed_at: new Date().toISOString(),
                    output_data: jobOutputs,
                    execution_progress: {
                        current_step: isCompleted ? finalJob.steps.length : currentStep,
                        total_steps: finalJob.steps.length
                    },
                    steps: finalJob.steps.map((step, idx) => {
                        // Mark all steps as completed if job is completed
                        if (isCompleted && idx < finalJob.steps.length) {
                            return {
                                ...step,
                                status: JobStatus.COMPLETED,
                                completed_at: step.completed_at || new Date().toISOString()
                            };
                        }
                        return step;
                    })
                };

                // Format final output summary
                const outputSummary = Object.entries(jobOutputs)
                    .map(([key, value]) => {
                        const displayValue = typeof value === 'object'
                            ? JSON.stringify(value, null, 2).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
                            : String(value);
                        return `${key}: ${displayValue}`;
                    })
                    .join('\n');

                const finalMessage = isCompleted
                    ? `Job completed successfully.\n\nFinal outputs:\n${outputSummary}`
                    : 'Job failed to complete. See error details above.';

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === job.job_id ? completedJob : j),
                    currentJob: completedJob,
                    executionState: {
                        ...prev.executionState!,
                        current_step_index: isCompleted ? finalJob.steps.length : currentStep,
                        live_output: finalMessage,
                        status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED,
                        step_results: stepResults
                    },
                    isLoading: false
                };
            });
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to run job',
                code: 'JOB_RUN_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError,
                executionState: prev.executionState ? {
                    ...prev.executionState,
                    status: JobStatus.FAILED,
                    live_output: `Job execution failed: ${jobError.message}`
                } : undefined
            }));
            throw error;
        }
    }, [state.currentJob, state.jobs, state.inputValues]);

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

    const resetJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => {
            const job = prev.jobs.find(j => j.job_id === jobId);
            if (!job) return prev;

            const resetJob = {
                ...job,
                status: JobStatus.PENDING,
                error_message: undefined,
                started_at: undefined,
                completed_at: undefined,
                steps: job.steps.map(step => ({
                    ...step,
                    status: JobStatus.PENDING,
                    output_data: undefined,
                    error_message: undefined,
                    started_at: undefined,
                    completed_at: undefined
                }))
            };

            return {
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? resetJob : j),
                currentJob: prev.currentJob?.job_id === jobId ? resetJob : prev.currentJob,
                inputValues: {},
                inputErrors: {}
            };
        });
    }, []);

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

            // Validate in real-time if needed
            if (!value || value === '') {
                newInputErrors[variableId] = 'This field is required';
            }

            return {
                ...prev,
                inputValues: newInputValues,
                inputErrors: newInputErrors
            };
        });
    }, []);

    const validateInputs = useCallback(() => {
        if (!state.currentJob?.workflow_id) return false;

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob?.workflow_id);
        if (!workflow) return false;

        // Use getWorkflowInputs helper to get inputs from workflow state
        const workflowInputs = getWorkflowInputs(workflow);

        const newErrors: Record<string, string> = {};
        let isValid = true;

        workflowInputs.forEach((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (input.schema.type === 'boolean') return;
            if (input.schema.type === 'file') {
                if (!value?.file_id) {
                    newErrors[input.variable_id] = 'Please select a file';
                    isValid = false;
                }
                return;
            }
            if (!value) {
                newErrors[input.variable_id] = 'This field is required';
                isValid = false;
            }
        });

        setState(prev => ({
            ...prev,
            inputErrors: newErrors
        }));

        return isValid;
    }, [state.currentJob, state.inputValues, workflows]);

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
    const setCurrentJob = useCallback((job?: Job) => {
        setState(prev => ({ ...prev, currentJob: job }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: undefined }));
    }, []);

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
        validateInputs,
        clearInputs,
        areInputsValid,
        setCurrentJob,
        resetCurrentJob,
        clearError,
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