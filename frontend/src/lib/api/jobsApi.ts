import { api, handleApiError } from './index';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, JobVariable, StepExecutionResult } from '../../types/jobs';
import { toolApi } from './toolApi';
import { ToolOutputName } from '../../types/tools';
import { workflowApi } from './workflowApi';
import { WorkflowStep } from '../../types/workflows';

// ============= Development Mock Data (TEMPORARY) =============
const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `job-${timestamp}-${randomStr}`;
};

// Mock data store
const mockData: {
    jobs: Job[];
    usedIds: Set<string>;
    executionStates: Record<string, JobExecutionState>;
} = {
    jobs: [],
    usedIds: new Set(),
    executionStates: {}
};

// Mock data management (will be replaced by real API calls)
const mockApi = {
    createJob: async (data: CreateJobRequest): Promise<Job> => {
        let jobId;
        do {
            jobId = generateUniqueId();
        } while (mockData.usedIds.has(jobId));
        mockData.usedIds.add(jobId);

        // Get workflow to copy steps
        const workflow = await workflowApi.getWorkflow(data.workflow_id);
        const workflowSteps = workflow.steps.map((step: WorkflowStep, index: number) => ({
            step_id: generateUniqueId(),
            job_id: jobId,
            sequence_number: index,
            status: JobStatus.PENDING,
            tool: step.tool,
            parameter_mappings: step.parameter_mappings,
            output_mappings: step.output_mappings
        }));

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
            steps: workflowSteps,
            execution_progress: {
                current_step: 0,
                total_steps: workflowSteps.length
            },
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

        // Initialize execution state
        mockData.executionStates[jobId] = {
            job_id: jobId,
            current_step_index: 0,
            total_steps: updatedJob.steps.length,
            is_paused: false,
            live_output: '',
            status: JobStatus.RUNNING,
            step_results: [],
            variables: Object.fromEntries(
                (inputVariables || []).map(v => [v.schema.name, v.value])
            )
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
        const state = mockData.executionStates[jobId];
        if (!state) throw new Error('Job execution state not found');
        return { ...state };
    },

    executeStep: async (jobId: string, stepIndex: number): Promise<StepExecutionResult> => {
        const job = mockData.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');

        const state = mockData.executionStates[jobId];
        if (!state) throw new Error('Job execution state not found');

        const step = job.steps[stepIndex];
        if (!step) throw new Error('Step not found');

        // Create step result
        const stepResult: StepExecutionResult = {
            step_id: step.step_id,
            status: JobStatus.RUNNING,
            started_at: new Date().toISOString(),
        };

        try {
            // Execute the step using toolApi
            const tool = step.tool;
            if (!tool) throw new Error('No tool configured for step');

            // Prepare parameters from variable mappings
            const parameters: Record<string, any> = {};
            for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
                parameters[paramName] = state.variables[varName];
            }

            // Execute the tool
            const result = await toolApi.executeTool(tool.tool_id, parameters);

            // Update variables with output mappings
            for (const [outputName, varName] of Object.entries(step.output_mappings)) {
                state.variables[varName] = result[outputName as ToolOutputName];
            }

            // Update step result
            stepResult.status = JobStatus.COMPLETED;
            stepResult.output_data = result;
            stepResult.completed_at = new Date().toISOString();

            // Update execution state
            state.step_results[stepIndex] = stepResult;
            state.current_step_index = stepIndex + 1;
            if (stepIndex + 1 >= job.steps.length) {
                state.status = JobStatus.COMPLETED;
                job.status = JobStatus.COMPLETED;
                job.completed_at = new Date().toISOString();
            }

            return stepResult;
        } catch (error) {
            stepResult.status = JobStatus.FAILED;
            stepResult.error_message = error instanceof Error ? error.message : 'Unknown error';
            stepResult.completed_at = new Date().toISOString();

            // Update execution state
            state.step_results[stepIndex] = stepResult;
            state.status = JobStatus.FAILED;
            job.status = JobStatus.FAILED;
            job.error_message = stepResult.error_message;

            throw error;
        }
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
    },

    executeStep: async (jobId: string, stepIndex: number): Promise<StepExecutionResult> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/steps/${stepIndex}/execute`);
            // return response.data;
            return mockApi.executeStep(jobId, stepIndex);
        } catch (error) {
            throw handleApiError(error);
        }
    }
}; 