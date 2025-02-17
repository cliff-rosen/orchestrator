import { api, handleApiError } from './index';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable } from '../../types/jobs';

// ============= Development Mock Data (TEMPORARY) =============
const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `job-${timestamp}-${randomStr}`;
};

// Mock data store
const mockData = {
    jobs: [
        {
            job_id: 'sample-job-1',
            workflow_id: 'workflow-1',
            user_id: 'user-1',
            name: 'Sample Job',
            description: 'A sample job for development',
            status: JobStatus.PENDING,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            input_variables: [
                {
                    name: 'query',
                    label: 'Search Query',
                    description: 'The search query to execute',
                    value: 'test query',
                    type: 'string',
                    required: true
                }
            ],
            steps: []
        } as Job
    ],
    usedIds: new Set(['sample-job-1'])
};

// Mock data management (will be replaced by real API calls)
const mockApi = {
    createJob: (data: CreateJobRequest): Job => {
        let jobId;
        do {
            jobId = generateUniqueId();
        } while (mockData.usedIds.has(jobId));
        mockData.usedIds.add(jobId);

        const newJob: Job = {
            job_id: jobId,
            workflow_id: data.workflow_id,
            user_id: 'user-1',
            name: data.name,
            description: data.description,
            status: JobStatus.PENDING,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            input_variables: data.input_variables,
            steps: [],
            output_data: null
        };

        mockData.jobs.push(newJob);
        return { ...newJob };
    },

    getJobs: (): Job[] => {
        return mockData.jobs.map(job => ({ ...job }));
    },

    getJob: (jobId: string): Job => {
        const job = mockData.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');
        return { ...job };
    },

    startJob: (jobId: string, inputVariables?: JobVariable[]): Job => {
        const jobIndex = mockData.jobs.findIndex(j => j.job_id === jobId);
        if (jobIndex === -1) throw new Error('Job not found');

        const updatedJob = {
            ...mockData.jobs[jobIndex],
            status: JobStatus.RUNNING,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            input_variables: inputVariables || mockData.jobs[jobIndex].input_variables
        };

        mockData.jobs[jobIndex] = updatedJob;
        return { ...updatedJob };
    },

    cancelJob: (jobId: string): Job => {
        const jobIndex = mockData.jobs.findIndex(j => j.job_id === jobId);
        if (jobIndex === -1) throw new Error('Job not found');

        const updatedJob = {
            ...mockData.jobs[jobIndex],
            status: JobStatus.FAILED,
            error_message: 'Job cancelled by user',
            updated_at: new Date().toISOString()
        };

        mockData.jobs[jobIndex] = updatedJob;
        return { ...updatedJob };
    },

    deleteJob: (jobId: string): void => {
        mockData.jobs = mockData.jobs.filter(j => j.job_id !== jobId);
    },

    getJobExecutionState: (jobId: string): JobExecutionState => {
        const job = mockData.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');

        return {
            job_id: jobId,
            current_step_index: 0,
            total_steps: 1,
            is_paused: false,
            live_output: 'Sample output...',
            status: job.status
        };
    }
};

// ============= Permanent API Client Code =============
export const jobsApi = {
    createJob: async (request: CreateJobRequest): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post('/api/jobs', request);
            // return response.data;
            return mockApi.createJob(request);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getJobs: async (): Promise<Job[]> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get('/api/jobs');
            // return response.data;
            return mockApi.getJobs();
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getJob: async (jobId: string): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get(`/api/jobs/${jobId}`);
            // return response.data;
            return mockApi.getJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    startJob: async (jobId: string, inputVariables?: JobVariable[]): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/start`, { input_variables: inputVariables });
            // return response.data;
            return mockApi.startJob(jobId, inputVariables);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getJobExecutionState: async (jobId: string): Promise<JobExecutionState> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get(`/api/jobs/${jobId}/execution-state`);
            // return response.data;
            return mockApi.getJobExecutionState(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    cancelJob: async (jobId: string): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/cancel`);
            // return response.data;
            return mockApi.cancelJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteJob: async (jobId: string): Promise<void> => {
        try {
            // TODO: Replace with actual API call
            // await api.delete(`/api/jobs/${jobId}`);
            return mockApi.deleteJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    }
}; 