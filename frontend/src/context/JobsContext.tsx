import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable, StepExecutionResult, JobId, JobStepId, JobStep } from '../types/jobs';
import { WorkflowVariable, WorkflowVariableName, WorkflowStepType } from '../types/workflows';
import { SchemaValueType } from '../types/schema';
import { useWorkflows } from './WorkflowContext';
import { toolApi } from '../lib/api/toolApi';

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
    startJob: () => Promise<void>;
    executeStep: (stepIndex: number, jobOutputs: Record<WorkflowVariableName, SchemaValueType>, inputVariables?: JobVariable[]) => Promise<StepExecutionResult>;
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

            const newJob: Job = {
                job_id: jobId,
                workflow_id: request.workflow_id,
                name: request.name,
                description: request.description || '',
                status: JobStatus.PENDING,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: 'default',
                input_variables: workflow.inputs?.map((i) => ({
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

    const executeStep = useCallback(async (
        stepIndex: number,
        jobOutputs: Record<WorkflowVariableName, SchemaValueType>,
        inputVariables?: JobVariable[]
    ): Promise<StepExecutionResult> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            if (!state.currentJob) {
                throw new Error('No current job selected');
            }

            const step = state.currentJob.steps[stepIndex];
            if (!step) throw new Error('Step not found');

            // Set step to running state first
            setState(prev => {
                if (!prev.currentJob) return prev;

                const updatedJob = {
                    ...prev.currentJob,
                    status: JobStatus.RUNNING,
                    execution_progress: {
                        current_step: stepIndex,
                        total_steps: prev.currentJob.steps.length
                    },
                    steps: prev.currentJob.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.RUNNING,
                                started_at: new Date().toISOString()
                            };
                        }
                        return s;
                    })
                };

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                    currentJob: updatedJob,
                    executionState: {
                        ...prev.executionState!,
                        current_step_index: stepIndex,
                        status: JobStatus.RUNNING,
                        live_output: `Preparing to execute ${step.step_type === 'EVALUATION' ? 'evaluation' : step.tool?.name || 'step'}...`
                    }
                };
            });

            let result: StepExecutionResult;

            if (step.step_type === 'EVALUATION') {
                if (!step.evaluation_config) {
                    throw new Error('No evaluation configuration found');
                }

                // 1. Get all available variables for condition evaluation
                const variables = new Map<string, any>();

                // Add input variables
                inputVariables?.forEach(input => {
                    variables.set(input.name, input.value);
                });

                // Add job outputs from previous steps
                Object.entries(jobOutputs).forEach(([name, value]) => {
                    variables.set(name, value);
                });

                // 2. Evaluate conditions in order until one is met
                let metCondition = null;
                for (const condition of step.evaluation_config.conditions) {
                    const variableValue = variables.get(condition.variable);
                    if (variableValue === undefined) continue;

                    let conditionMet = false;
                    switch (condition.operator) {
                        case 'equals':
                            conditionMet = variableValue === condition.value;
                            break;
                        case 'not_equals':
                            conditionMet = variableValue !== condition.value;
                            break;
                        case 'greater_than':
                            conditionMet = variableValue > condition.value;
                            break;
                        case 'less_than':
                            conditionMet = variableValue < condition.value;
                            break;
                        case 'contains':
                            conditionMet = String(variableValue).includes(String(condition.value));
                            break;
                        case 'not_contains':
                            conditionMet = !String(variableValue).includes(String(condition.value));
                            break;
                    }

                    if (conditionMet) {
                        metCondition = {
                            condition,
                            value: variableValue
                        };
                        break;
                    }
                }

                // 3. Determine final result based on evaluation
                result = metCondition ? {
                    step_id: step.step_id,
                    success: true,
                    outputs: {
                        condition_met: metCondition.condition.condition_id,
                        variable_name: metCondition.condition.variable,
                        variable_value: String(metCondition.value),
                        operator: metCondition.condition.operator,
                        comparison_value: String(metCondition.condition.value),
                        target_step_index: String(metCondition.condition.target_step_index),
                        next_step: String(metCondition.condition.target_step_index),
                        action: 'jump'
                    } as Record<string, string>,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                } : {
                    step_id: step.step_id,
                    success: true,
                    outputs: {
                        condition_met: 'none',
                        reason: 'No conditions met - continuing to next step',
                        target_step_index: '',  // Empty when continuing to next step
                        next_step: String(stepIndex + 1),  // Still track the next step for display
                        action: 'continue'  // Use continue action instead of jump
                    } as Record<string, string>,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                };
            } else {
                // Handle tool execution
                if (!step.tool) throw new Error('No tool configured for step');

                // Resolve parameter values from job outputs and input values
                const resolvedParameters: Record<string, SchemaValueType> = {};

                // For LLM tools, include the prompt template ID
                if (step.tool.tool_type === 'llm' && step.prompt_template_id) {
                    resolvedParameters["prompt_template_id"] = step.prompt_template_id;
                }

                // For each parameter mapping, resolve the variable reference to its actual value
                Object.entries(step.parameter_mappings || {}).forEach(([paramName, variableName]) => {
                    // All parameter mappings should reference variables by their name
                    if (typeof variableName !== 'string') {
                        console.warn('Invalid parameter mapping - expected variable name:', {
                            parameter: paramName,
                            value: variableName
                        });
                        return;
                    }

                    // First check input variables
                    const inputVariable = inputVariables?.find(v => v.name === variableName);
                    if (inputVariable?.value !== undefined) {
                        resolvedParameters[paramName] = inputVariable.value as SchemaValueType;
                        return;
                    }

                    // Then check job outputs from previous steps
                    if (variableName in jobOutputs) {
                        resolvedParameters[paramName] = jobOutputs[variableName as WorkflowVariableName];
                        return;
                    }

                    console.warn(`Could not resolve variable reference:`, {
                        parameter: paramName,
                        variableName,
                        availableInputs: inputVariables,
                        availableOutputs: Object.keys(jobOutputs)
                    });
                });

                // Update live output to show we're executing
                setState(prev => ({
                    ...prev,
                    executionState: {
                        ...prev.executionState!,
                        live_output: `Executing ${step.tool?.name || 'step'} with resolved parameters...\n${Object.entries(resolvedParameters)
                            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                            .join('\n')
                            }`
                    }
                }));

                // Execute the tool with resolved parameters
                const toolResult = await toolApi.executeTool(step.tool.tool_id, resolvedParameters);

                result = {
                    step_id: step.step_id,
                    success: true,
                    outputs: toolResult,
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                };
            }

            // Update job state with success
            setState(prev => {
                if (!prev.currentJob) return prev;

                const updatedJob = {
                    ...prev.currentJob,
                    status: JobStatus.RUNNING,
                    execution_progress: {
                        current_step: stepIndex + 1,
                        total_steps: prev.currentJob.steps.length
                    },
                    steps: prev.currentJob.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.COMPLETED,
                                output_data: result.outputs,
                                completed_at: new Date().toISOString()
                            };
                        }
                        return s;
                    })
                };

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                    currentJob: updatedJob,
                    executionState: {
                        ...prev.executionState!,
                        current_step_index: stepIndex + 1,
                        status: JobStatus.RUNNING,
                        step_results: [
                            ...prev.executionState!.step_results,
                            result
                        ]
                    },
                    isLoading: false
                };
            });

            return result;
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to execute step',
                code: 'STEP_EXECUTION_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };

            // Get the step again since we're in a new scope
            const failedStep = state.currentJob?.steps[stepIndex];
            if (!failedStep) {
                throw new Error('Step not found during error handling');
            }

            setState(prev => {
                if (!prev.currentJob) return prev;

                const updatedJob = {
                    ...prev.currentJob,
                    status: JobStatus.FAILED,
                    error: jobError,
                    execution_progress: {
                        current_step: stepIndex,
                        total_steps: prev.currentJob.steps.length
                    },
                    steps: prev.currentJob.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.FAILED,
                                error_message: jobError.message
                            };
                        }
                        return s;
                    })
                };

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === updatedJob.job_id ? updatedJob : j),
                    currentJob: updatedJob,
                    executionState: {
                        ...prev.executionState!,
                        status: JobStatus.FAILED,
                        step_results: [
                            ...prev.executionState!.step_results,
                            {
                                step_id: failedStep.step_id,
                                success: false,
                                error: jobError.message,
                                started_at: new Date().toISOString()
                            }
                        ]
                    },
                    isLoading: false,
                    error: jobError
                };
            });

            throw error;
        }
    }, [state.currentJob, state.jobs]);

    const startJob = useCallback(async (): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            console.log('JobsContext.tsx startJob');
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
                    status: step.status === JobStatus.COMPLETED ? JobStatus.COMPLETED : JobStatus.PENDING,
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
                executionState: initialExecutionState
            }));

            // Execute steps sequentially
            let currentStep = 0;
            const jobOutputs: Record<WorkflowVariableName, SchemaValueType> = {};
            const stepJumpCounts: Record<string, number> = {}; // Track jumps per step

            console.log('******************** ENTERING WHILE LOOP ********************');
            while (currentStep < updatedJob.steps.length) {
                try {
                    // Update live output to show progress
                    setState(prev => ({
                        ...prev,
                        executionState: {
                            ...prev.executionState!,
                            live_output: `Starting step ${currentStep + 1} of ${updatedJob.steps.length}...`
                        }
                    }));

                    console.log('******************** EXECUTING STEP ********************');
                    const stepResult = await executeStep(currentStep, jobOutputs, preparedInputVariables);

                    // Update job outputs
                    if (stepResult.outputs) {
                        const step = updatedJob.steps[currentStep];
                        if (step?.output_mappings) {
                            Object.entries(step.output_mappings).forEach(([outputName, variableName]) => {
                                const outputs = stepResult.outputs as Record<string, SchemaValueType>;
                                if (outputs && outputName in outputs) {
                                    jobOutputs[variableName as WorkflowVariableName] = outputs[outputName];
                                }
                            });

                            // Update live output to show output mappings
                            setState(prev => ({
                                ...prev,
                                executionState: {
                                    ...prev.executionState!,
                                    live_output: `Step ${currentStep + 1} completed. Mapped outputs:\n${Object.entries(jobOutputs)
                                        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                                        .join('\n')
                                        }`
                                }
                            }));
                        }
                    }

                    // Check if job was cancelled or failed
                    const currentJobState = state.jobs.find(j => j.job_id === job.job_id);
                    if (currentJobState?.status === JobStatus.FAILED) {
                        setState(prev => ({
                            ...prev,
                            executionState: {
                                ...prev.executionState!,
                                live_output: 'Job execution cancelled or failed.'
                            }
                        }));
                        break;
                    }

                    // Handle step result and determine next step
                    const step = updatedJob.steps[currentStep];
                    if (step.step_type === WorkflowStepType.EVALUATION && stepResult.outputs) {
                        const evalResult = stepResult.outputs as Record<string, string>;

                        if (evalResult.action === 'jump' && evalResult.target_step_index) {
                            // Convert target_step_index from string to number
                            const targetStep = parseInt(evalResult.target_step_index);

                            // Check if we've exceeded maximum jumps for this step
                            const stepId = step.step_id;
                            stepJumpCounts[stepId] = (stepJumpCounts[stepId] || 0) + 1;

                            const maxJumps = step.evaluation_config?.maximum_jumps ?? 1;
                            const shouldForceProgress = maxJumps > 0 && stepJumpCounts[stepId] >= maxJumps;

                            if (!shouldForceProgress && !isNaN(targetStep) && targetStep >= 0 && targetStep < updatedJob.steps.length) {
                                currentStep = targetStep;
                                setState(prev => ({
                                    ...prev,
                                    executionState: {
                                        ...prev.executionState!,
                                        live_output: `Evaluation condition met: Jumping to step ${targetStep + 1}`
                                    }
                                }));
                                continue; // Skip increment and continue loop with new step index
                            } else if (shouldForceProgress) {
                                setState(prev => ({
                                    ...prev,
                                    executionState: {
                                        ...prev.executionState!,
                                        live_output: `Maximum jumps (${maxJumps}) reached for step ${currentStep + 1}: Forcing continue`
                                    }
                                }));
                            }
                        } else if (evalResult.action === 'end') {
                            setState(prev => ({
                                ...prev,
                                executionState: {
                                    ...prev.executionState!,
                                    live_output: 'Evaluation result: End workflow execution'
                                }
                            }));
                            break; // Exit loop early
                        }
                        // For 'continue' action or invalid jump target, fall through to increment step
                    }

                    // Only increment step if we haven't jumped or ended
                    currentStep++;

                } catch (error) {
                    const jobError: JobError = {
                        message: error instanceof Error ? error.message : `Error executing step ${currentStep}`,
                        code: 'STEP_EXECUTION_ERROR',
                        details: error instanceof Error ? error.stack : undefined
                    };
                    setState(prev => ({
                        ...prev,
                        error: jobError,
                        executionState: {
                            ...prev.executionState!,
                            live_output: `Error in step ${currentStep + 1}: ${jobError.message}`
                        }
                    }));
                    break;
                }
            }

            // Update final job state
            setState(prev => {
                const finalJob = prev.jobs.find(j => j.job_id === job.job_id);
                if (!finalJob) return prev;

                const isCompleted = currentStep === updatedJob.steps.length;
                const completedJob = {
                    ...finalJob,
                    status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED,
                    completed_at: new Date().toISOString(),
                    output_data: jobOutputs,
                    execution_progress: {
                        current_step: currentStep,
                        total_steps: updatedJob.steps.length
                    }
                };

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === job.job_id ? completedJob : j),
                    currentJob: completedJob,
                    executionState: {
                        ...prev.executionState!,
                        live_output: isCompleted ? 'Job completed successfully.' : 'Job failed to complete.',
                        status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED
                    },
                    isLoading: false
                };
            });
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to start job',
                code: 'JOB_START_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError
            }));
            throw error;
        }
    }, [state.currentJob, state.jobs, state.inputValues, executeStep]);

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
        const workflowInputs = workflow?.inputs || [];

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
        const workflowInputs = workflow?.inputs || [];

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
        startJob,
        executeStep,
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