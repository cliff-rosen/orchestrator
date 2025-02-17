import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable } from '../types/jobs';
import { jobsApi } from '../lib/api/jobsApi';

interface JobsContextState {
    jobs: Job[];
    currentJob?: Job;
    executionState?: JobExecutionState;
    isLoading: boolean;
    error?: string;
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
    cancelJob: (jobId: string) => Promise<void>;

    // State Management
    setCurrentJob: (job?: Job) => void;
    resetCurrentJob: () => void;
    clearError: () => void;
}

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State
    const [state, setState] = useState<JobsContextState>({
        jobs: [],
        isLoading: false,
    });

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
    const startJob = useCallback(async (jobId: string, inputVariables?: JobVariable[]): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            const job = await jobsApi.startJob(jobId, inputVariables);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? job : j),
                currentJob: prev.currentJob?.job_id === jobId ? job : prev.currentJob,
                isLoading: false
            }));

            // Only start polling if the job is in RUNNING state
            if (job.status === JobStatus.RUNNING) {
                let isPolling = true;  // Flag to control polling

                const pollState = async () => {
                    if (!isPolling) return;  // Stop if we're no longer polling

                    try {
                        const executionState = await jobsApi.getJobExecutionState(jobId);
                        setState(prev => ({ ...prev, executionState }));

                        // Continue polling only if job is still running and we haven't stopped polling
                        if (executionState.status === JobStatus.RUNNING && isPolling) {
                            setTimeout(pollState, 1000);
                        } else {
                            isPolling = false;  // Stop polling when job is done
                        }
                    } catch (error) {
                        console.error('Failed to poll execution state:', error);
                        isPolling = false;  // Stop polling on error
                    }
                };

                pollState();
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to start job'
            }));
            throw error;
        }
    }, []);

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
        cancelJob,
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