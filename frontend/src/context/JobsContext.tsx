import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable, StepExecutionResult, JobId } from '../types/jobs';
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
    executeStep: (jobId: string, stepIndex: number) => Promise<StepExecutionResult>;
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
                input_variables: workflow.inputs?.map((i) => ({
                    ...i,
                    required: i.required || true,
                })) || [],
                steps: workflow.steps.map((step, index) => ({
                    step_id: `step-${Date.now()}-${index}`,
                    job_id: `job-${Date.now()}`,
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

    const executeStep = useCallback(async (jobId: string, stepIndex: number): Promise<StepExecutionResult> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = state.jobs.find(j => j.job_id === jobId);
            if (!job) throw new Error('Job not found');

            const step = job.steps[stepIndex];
            if (!step) throw new Error('Step not found');
            if (!step.tool) throw new Error('No tool configured for step');

            // Execute the tool
            const result = await toolApi.executeTool(step.tool.tool_id, {
                ...step.parameter_mappings,
                prompt_template_id: step.prompt_template_id
            });

            // Create step result
            const stepResult: StepExecutionResult = {
                step_id: step.step_id,
                success: true,
                outputs: result,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Update job state
            const updatedJob = {
                ...job,
                steps: job.steps.map((s, idx) => {
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

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob,
                isLoading: false
            }));

            return stepResult;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to execute step';

            // Update job state with error
            setState(prev => {
                const job = prev.jobs.find(j => j.job_id === jobId);
                if (!job) return prev;

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

                return {
                    ...prev,
                    jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                    currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob,
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

            // Update job with input variables and set status to running
            const updatedJob = {
                ...job,
                status: JobStatus.RUNNING,
                started_at: new Date().toISOString(),
                input_variables: inputVariables || []
            };

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === job.job_id ? updatedJob : j),
                currentJob: updatedJob
            }));

            // Execute steps sequentially
            let currentStep = 0;
            const jobOutputs: Record<WorkflowVariableName, SchemaValueType> = {};

            while (currentStep < updatedJob.steps.length) {
                try {
                    const stepResult = await executeStep(job.job_id, currentStep);

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
                        }
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
                    output_data: jobOutputs
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