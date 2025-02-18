import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable } from '../types/jobs';
import { jobsApi } from '../lib/api/jobsApi';
import { workflowApi } from '../lib/api/workflowApi';
import { WorkflowVariable } from '../types/workflows';
import { useWorkflows } from './WorkflowContext';

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
    startJob: (jobId: string, inputVariables?: JobVariable[]) => Promise<void>;
    executeStep: (jobId: string, stepIndex: number) => Promise<void>;
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

    // Load jobs on mount
    useEffect(() => {
        loadJobs();
    }, []);

    // Job list management
    const loadJobs = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const jobs = await jobsApi.getJobs();
            setState(prev => ({ ...prev, jobs, isLoading: false }));
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
            const job = await jobsApi.getJob(jobId);
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
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = await jobsApi.getJob(jobId);
            setState(prev => ({ ...prev, isLoading: false }));
            return job;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to get job'
            }));
            throw error;
        }
    }, []);

    const createJob = useCallback(async (request: CreateJobRequest): Promise<Job> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = await jobsApi.createJob(request);
            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, job],
                isLoading: false
            }));
            return job;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to create job'
            }));
            throw error;
        }
    }, []);

    const deleteJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            await jobsApi.deleteJob(jobId);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.filter(j => j.job_id !== jobId),
                currentJob: prev.currentJob?.job_id === jobId ? undefined : prev.currentJob,
                isLoading: false
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to delete job'
            }));
            throw error;
        }
    }, []);

    // Job execution
    const executeStep = useCallback(async (jobId: string, stepIndex: number): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Execute the step
            const stepResult = await jobsApi.executeStep(jobId, stepIndex);

            // Get updated execution state
            const executionState = await jobsApi.getJobExecutionState(jobId);

            // Get updated job
            const job = await jobsApi.getJob(jobId);

            // Update state
            console.log('JobsContext: Updating state', {
                currentJob: job,
                executionState,
                isLoading: false
            });
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? job : j),
                currentJob: prev.currentJob?.job_id === jobId ? job : prev.currentJob,
                executionState,
                isLoading: false
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to execute step'
            }));
            throw error;
        }
    }, []);

    const startJob = useCallback(async (jobId: string, inputVariables?: JobVariable[]): Promise<void> => {
        console.log('JobsContext: Starting job', { jobId, inputVariables });
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Initialize job state
            const job = await jobsApi.startJob(jobId, inputVariables);
            console.log('JobsContext: Job initialized', job);

            // Get execution state
            const executionState = await jobsApi.getJobExecutionState(jobId);
            console.log('JobsContext: Got execution state', executionState);

            // Update UI state with initial state
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? job : j),
                currentJob: prev.currentJob?.job_id === jobId ? job : prev.currentJob,
                executionState,
                isLoading: false
            }));

            // Start executing steps
            let currentStep = 0;
            while (currentStep < job.steps.length) {
                console.log(`JobsContext: Executing step ${currentStep}`);
                try {
                    // Execute step
                    await executeStep(jobId, currentStep);

                    // Get updated job state
                    const updatedJob = await jobsApi.getJob(jobId);
                    console.log('JobsContext: Updated job state:', updatedJob);

                    // Get updated execution state
                    const updatedState = await jobsApi.getJobExecutionState(jobId);
                    console.log('JobsContext: Updated execution state:', updatedState);

                    // Update UI with latest state - using a Promise to ensure state is updated
                    await new Promise<void>(resolve => {
                        setState(prev => {
                            const newState = {
                                ...prev,
                                jobs: prev.jobs.map(j => j.job_id === jobId ? updatedJob : j),
                                currentJob: prev.currentJob?.job_id === jobId ? updatedJob : prev.currentJob,
                                executionState: updatedState,
                                isLoading: false
                            };
                            resolve();
                            return newState;
                        });
                    });

                    // Check if job was cancelled or failed
                    if (updatedState.status === JobStatus.FAILED) {
                        console.log('JobsContext: Job failed, breaking execution');
                        break;
                    }

                    // Add a small delay to ensure UI can update
                    await new Promise(resolve => setTimeout(resolve, 100));

                    currentStep++;
                } catch (error) {
                    console.error(`JobsContext: Error executing step ${currentStep}:`, error);

                    // Update UI with error state
                    const failedJob = await jobsApi.getJob(jobId);
                    const failedState = await jobsApi.getJobExecutionState(jobId);

                    setState(prev => ({
                        ...prev,
                        jobs: prev.jobs.map(j => j.job_id === jobId ? failedJob : j),
                        currentJob: prev.currentJob?.job_id === jobId ? failedJob : prev.currentJob,
                        executionState: failedState,
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to execute step'
                    }));

                    break;
                }
            }
        } catch (error) {
            console.error('JobsContext: Error starting job:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to start job'
            }));
            throw error;
        }
    }, [executeStep]);

    const cancelJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = await jobsApi.cancelJob(jobId);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? job : j),
                currentJob: prev.currentJob?.job_id === jobId ? job : prev.currentJob,
                isLoading: false
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to cancel job'
            }));
            throw error;
        }
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

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob.workflow_id);
        const workflowInputs = workflow?.inputs || [];

        const newErrors: Record<string, string> = {};
        let isValid = true;

        workflowInputs.forEach((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (!value && input.schema.type !== 'boolean') {
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

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob.workflow_id);
        const workflowInputs = workflow?.inputs || [];

        return workflowInputs.every((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (input.schema.type === 'boolean') return true;
            if (input.schema.type === 'file') return value instanceof File;
            return value !== undefined && value !== '';
        });
    }, [state.currentJob, state.inputValues, workflows]);

    const resetJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = await jobsApi.resetJob(jobId);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? job : j),
                currentJob: prev.currentJob?.job_id === jobId ? job : prev.currentJob,
                isLoading: false,
                inputValues: {},
                inputErrors: {}
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to reset job'
            }));
            throw error;
        }
    }, []);

    // State management helpers
    const setCurrentJob = useCallback((job?: Job) => {
        setState(prev => ({ ...prev, currentJob: job }));
    }, []);

    const resetCurrentJob = useCallback(() => {
        setState(prev => ({ ...prev, currentJob: undefined }));
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