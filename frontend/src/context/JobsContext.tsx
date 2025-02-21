import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable, StepExecutionResult, JobId, JobStepId } from '../types/jobs';
import { WorkflowVariable, WorkflowVariableName } from '../types/workflows';
import { SchemaValueType } from '../types/schema';
import { useWorkflows } from './WorkflowContext';
import { toolApi } from '../lib/api/toolApi';

interface JobsContextState {
    jobs: Job[];
    currentJob?: Job;
    executionState?: JobExecutionState;
    isLoading: boolean;
    error?: string;
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
    startJob: (inputVariables?: JobVariable[]) => Promise<void>;
    executeStep: (jobId: string, stepIndex: number, jobOutputs: Record<WorkflowVariableName, SchemaValueType>) => Promise<StepExecutionResult>;
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
                error: error instanceof Error ? error.message : 'Failed to load jobs'
            }));
        }
    }, []);

    const loadJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            console.log('loadJob', jobId, state.jobs);
            const job = state.jobs.find(j => j.job_id === jobId);
            if (!job) throw new Error('Job not found');
            setState(prev => ({ ...prev, currentJob: job, isLoading: false }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load job'
            }));
            throw error;
        }
    }, []);

    const getJob = useCallback(async (jobId: string): Promise<Job> => {
        const job = state.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');
        return job;
    }, [state.jobs]);

    const createJob = useCallback(async (request: CreateJobRequest): Promise<Job> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Create a new job with initial state
            const workflow = workflows?.find(w => w.workflow_id === request.workflow_id);
            if (!workflow) throw new Error('Workflow not found');

            const jobId = `job-${Date.now()}` as JobId;
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
                steps: workflow.steps.map((step, index) => ({
                    step_id: `step-${Date.now()}-${index}` as JobStepId,
                    job_id: `job-${Date.now()}` as JobId,
                    sequence_number: index,
                    status: JobStatus.PENDING,
                    tool: step.tool,
                    prompt_template_id: step.prompt_template_id,
                    parameter_mappings: step.parameter_mappings,
                    output_mappings: step.output_mappings
                }))
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
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to create job'
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
        jobId: string,
        stepIndex: number,
        jobOutputs: Record<WorkflowVariableName, SchemaValueType>
    ): Promise<StepExecutionResult> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = state.jobs.find(j => j.job_id === jobId);
            if (!job) throw new Error('Job not found');

            const step = job.steps[stepIndex];
            if (!step) throw new Error('Step not found');
            if (!step.tool) throw new Error('No tool configured for step');

            // Set step to running state first
            setState(prev => {
                const job = prev.jobs.find(j => j.job_id === jobId);
                if (!job) return prev;

                const updatedJob = {
                    ...job,
                    status: JobStatus.RUNNING,
                    steps: job.steps.map((s, idx) => {
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
                    jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                    currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob
                };
            });

            // Execute the tool
            console.log('Executing tool with parameters:', {
                toolId: step.tool.tool_id,
                parameterMappings: step.parameter_mappings,
                promptTemplateId: step.prompt_template_id,
                currentOutputs: jobOutputs,
                currentInputs: state.inputValues
            });

            // Resolve parameter values from job outputs and input values
            const resolvedParameters: Record<string, SchemaValueType> = {};

            // For each parameter mapping, resolve the variable reference to its actual value
            Object.entries(step.parameter_mappings).forEach(([paramName, variableName]) => {
                // All parameter mappings should reference variables by their name
                if (typeof variableName !== 'string') {
                    console.warn('Invalid parameter mapping - expected variable name:', {
                        parameter: paramName,
                        value: variableName
                    });
                    return;
                }

                // First check job outputs (from previous steps)
                // jobOutputs are already keyed by variable name
                if (variableName in jobOutputs) {
                    resolvedParameters[paramName] = jobOutputs[variableName as WorkflowVariableName];
                    return;
                }

                // Then check job input variables
                const inputVariable = job.input_variables?.find(v => v.name === variableName);
                if (inputVariable?.value !== undefined) {
                    resolvedParameters[paramName] = inputVariable.value as SchemaValueType;
                    return;
                }

                // Finally check job output_data
                if (job.output_data && variableName in job.output_data) {
                    resolvedParameters[paramName] = job.output_data[variableName] as SchemaValueType;
                    return;
                }

                console.warn('Could not resolve variable reference:', {
                    parameter: paramName,
                    variableName,
                    availableOutputs: Object.keys(jobOutputs),
                    availableInputs: job.input_variables?.map(v => v.name),
                    availableJobOutputs: job.output_data ? Object.keys(job.output_data) : []
                });
            });

            console.log('Resolved parameters:', {
                original: step.parameter_mappings,
                resolved: resolvedParameters,
                jobOutputs,
                inputVariables: job.input_variables,
                jobOutputData: job.output_data
            });

            const result = await toolApi.executeTool(step.tool.tool_id, resolvedParameters);

            console.log('Tool execution result:', {
                toolId: step.tool.tool_id,
                result
            });

            // Ensure result is properly structured
            const normalizedResult = typeof result === 'string' ? { output: result } : result;

            // Create step result
            const stepResult: StepExecutionResult = {
                step_id: step.step_id,
                success: true,
                outputs: normalizedResult,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Update both job and execution state
            setState(prev => {
                const currentJob = prev.jobs.find(j => j.job_id === jobId) || job;

                const executionState = prev.executionState || {
                    job_id: jobId as JobId,
                    current_step_index: 0,
                    total_steps: job.steps.length,
                    is_paused: false,
                    live_output: '',
                    status: JobStatus.RUNNING,
                    step_results: [],
                    variables: {}
                };

                const updatedExecutionState = {
                    ...executionState,
                    current_step_index: stepIndex + 1,
                    step_results: [...executionState.step_results, stepResult]
                };

                const updatedJob = {
                    ...currentJob,
                    status: JobStatus.RUNNING,
                    execution_progress: {
                        current_step: stepIndex + 1,
                        total_steps: job.steps.length
                    },
                    steps: currentJob.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.COMPLETED,
                                output_data: result,
                                started_at: stepResult.started_at,
                                completed_at: stepResult.completed_at
                            };
                        }
                        return s;
                    })
                };

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                    currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob,
                    executionState: updatedExecutionState,
                    isLoading: false
                };
            });

            return stepResult;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to execute step';

            // Update both job and execution state with error
            setState(prev => {
                const job = prev.jobs.find(j => j.job_id === jobId);
                if (!job) return prev;

                const step = job.steps[stepIndex];
                if (!step) return prev;

                const updatedJob = {
                    ...job,
                    status: JobStatus.FAILED,
                    error_message: errorMessage,
                    steps: job.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.FAILED,
                                error_message: errorMessage
                            };
                        }
                        return s;
                    })
                };

                const executionState = prev.executionState;
                const updatedExecutionState = executionState ? {
                    ...executionState,
                    status: JobStatus.FAILED,
                    step_results: [
                        ...executionState.step_results,
                        {
                            step_id: step.step_id,
                            success: false,
                            error: errorMessage,
                            started_at: new Date().toISOString(),
                            completed_at: new Date().toISOString()
                        }
                    ]
                } : undefined;

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                    currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob,
                    executionState: updatedExecutionState,
                    isLoading: false,
                    error: errorMessage
                };
            });

            throw error;
        }
    }, [state.jobs]);

    const startJob = useCallback(async (inputVariables?: JobVariable[]): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            console.log('JobsContext.tsx startJob', inputVariables);
            const job = state.currentJob;
            if (!job) throw new Error('No job selected');

            // Update job with input variables and set initial running state
            const updatedJob = {
                ...job,
                status: JobStatus.RUNNING,
                started_at: new Date().toISOString(),
                input_variables: inputVariables || [],
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
                live_output: '',
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

            console.log('******************** ENTERING WHILE LOOP ********************');
            while (currentStep < updatedJob.steps.length) {
                try {
                    console.log('******************** EXECUTING STEP ********************');
                    const stepResult = await executeStep(job.job_id, currentStep, jobOutputs);

                    // Update job outputs
                    if (stepResult.outputs) {
                        const step = updatedJob.steps[currentStep];
                        console.log('Step output processing:', {
                            stepIndex: currentStep,
                            stepId: step.step_id,
                            toolOutputs: stepResult.outputs,
                            outputMappings: step?.output_mappings,
                            currentJobOutputs: jobOutputs
                        });

                        if (step?.output_mappings) {
                            Object.entries(step.output_mappings).forEach(([outputName, variableName]) => {
                                console.log('Processing output mapping:', {
                                    outputName,
                                    variableName,
                                    availableOutputs: Object.keys(stepResult.outputs || {})
                                });

                                const outputs = stepResult.outputs as Record<string, SchemaValueType>;
                                if (outputs && outputName in outputs) {
                                    console.log('Mapping output to variable:', {
                                        from: outputName,
                                        to: variableName,
                                        value: outputs[outputName]
                                    });
                                    jobOutputs[variableName as WorkflowVariableName] = outputs[outputName];
                                } else {
                                    console.warn('Output not found:', {
                                        outputName,
                                        availableOutputs: Object.keys(outputs || {})
                                    });
                                }
                            });
                        }

                        console.log('Updated job outputs:', jobOutputs);
                    }

                    // Check if job was cancelled or failed
                    const currentJobState = state.jobs.find(j => j.job_id === job.job_id);
                    if (currentJobState?.status === JobStatus.FAILED) {
                        break;
                    }

                    currentStep++;
                } catch (error) {
                    console.error(`Error executing step ${currentStep}:`, error);
                    break;
                }
            }

            // Update final job state
            setState(prev => {
                const finalJob = prev.jobs.find(j => j.job_id === job.job_id);
                if (!finalJob) return prev;

                const completedJob = {
                    ...finalJob,
                    status: currentStep === updatedJob.steps.length ? JobStatus.COMPLETED : JobStatus.FAILED,
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
                    isLoading: false
                };
            });
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to start job'
            }));
            throw error;
        }
    }, [state.currentJob, state.jobs, executeStep]);

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
                currentJob: prev.currentJob?.job_id === jobId ? cancelledJob : prev.currentJob
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