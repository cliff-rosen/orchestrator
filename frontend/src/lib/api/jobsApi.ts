import { api, handleApiError } from './index';
import { Job, JobStatus, JobExecutionState, CreateJobRequest } from '../../types/jobs';

// Stub data for development
const sampleJob: Job = {
    job_id: 'job-1',
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
};

// In-memory storage for development
let stubJobs: Job[] = [sampleJob];
let nextJobId = 2; // For generating sequential IDs in development

export const jobsApi = {
    // Create a new job
    createJob: async (request: CreateJobRequest): Promise<Job> => {
        try {
            // For development, create a stub job
            const newJob: Job = {
                job_id: `job-${nextJobId++}`, // We'll use sequential IDs for development
                workflow_id: request.workflow_id,
                user_id: 'user-1', // Hardcoded for now
                name: request.name,
                description: request.description,
                status: JobStatus.PENDING,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                input_variables: request.input_variables,
                steps: [],
                output_data: null
            };

            // Add to stub jobs
            stubJobs.push(newJob);
            return newJob;

            // TODO: Implement actual API call
            // const response = await api.post('/api/jobs', request);
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Get all jobs
    getJobs: async (): Promise<Job[]> => {
        try {
            // For development, return stub jobs
            return stubJobs;

            // TODO: Implement actual API call
            // const response = await api.get('/api/jobs');
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Get a specific job
    getJob: async (jobId: string): Promise<Job> => {
        try {
            // For development, return stub job
            const job = stubJobs.find(j => j.job_id === jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            return job;

            // TODO: Implement actual API call
            // const response = await api.get(`/api/jobs/${jobId}`);
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Start a job
    startJob: async (jobId: string): Promise<Job> => {
        try {
            // For development, update stub job
            const job = stubJobs.find(j => j.job_id === jobId);
            if (!job) {
                throw new Error('Job not found');
            }

            job.status = JobStatus.RUNNING;
            job.started_at = new Date().toISOString();
            job.updated_at = new Date().toISOString();

            return job;

            // TODO: Implement actual API call
            // const response = await api.post(`/api/jobs/${jobId}/start`);
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Get job execution state
    getJobExecutionState: async (jobId: string): Promise<JobExecutionState> => {
        try {
            // For development, return stub state
            const job = stubJobs.find(j => j.job_id === jobId);
            if (!job) {
                throw new Error('Job not found');
            }

            return {
                job_id: jobId,
                current_step_index: 0,
                total_steps: 1,
                is_paused: false,
                live_output: 'Sample output...',
                status: job.status
            };

            // TODO: Implement actual API call
            // const response = await api.get(`/api/jobs/${jobId}/execution-state`);
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Cancel a job
    cancelJob: async (jobId: string): Promise<Job> => {
        try {
            // For development, update stub job
            const job = stubJobs.find(j => j.job_id === jobId);
            if (!job) {
                throw new Error('Job not found');
            }

            job.status = JobStatus.FAILED;
            job.error_message = 'Job cancelled by user';
            job.updated_at = new Date().toISOString();

            return job;

            // TODO: Implement actual API call
            // const response = await api.post(`/api/jobs/${jobId}/cancel`);
            // return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Delete a job
    deleteJob: async (jobId: string): Promise<void> => {
        try {
            // For development, remove from stub jobs
            stubJobs = stubJobs.filter(j => j.job_id !== jobId);

            // TODO: Implement actual API call
            // await api.delete(`/api/jobs/${jobId}`);
        } catch (error) {
            throw handleApiError(error);
        }
    }
}; 