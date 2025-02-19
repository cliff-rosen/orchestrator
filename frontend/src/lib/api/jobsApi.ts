import { api, handleApiError } from './index';
import {
    Job,
    JobStatus,
    JobExecutionState,
    CreateJobRequest,
    JobVariable,
    StepExecutionResult,
    JobId,
    JobStepId
} from '../../types/jobs';
import { toolApi } from './toolApi';
import { ToolParameterName, ToolOutputName } from '../../types/tools';
import { workflowApi } from './workflowApi';
import { WorkflowStep, WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';

// ============= Development Mock Data (TEMPORARY) =============
const generateUniqueId = (prefix: string): string => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${randomStr}`;
};

const generateJobId = (): JobId => generateUniqueId('job') as JobId;
const generateStepId = (): JobStepId => generateUniqueId('step') as JobStepId;

// Mock data store with proper types
const mockData: {
    jobs: Job[];
    usedIds: Set<string>;
    executionStates: Record<JobId, JobExecutionState>;
} = {
    jobs: [],
    usedIds: new Set(),
    executionStates: {}
};

// Mock data management (will be replaced by real API calls)
const mockApi = {
    createJob: async (data: CreateJobRequest): Promise<Job> => {
        let jobId: JobId;
        do {
            jobId = generateJobId();
        } while (mockData.usedIds.has(jobId));
        mockData.usedIds.add(jobId);

        // Get workflow to copy steps
        const workflow = await workflowApi.getWorkflow(data.workflow_id);
        const workflowSteps = workflow.steps.map((step: WorkflowStep, index: number) => ({
            step_id: generateStepId(),
            job_id: jobId,
            sequence_number: index,
            status: JobStatus.PENDING,
            tool: step.tool,
            parameter_mappings: step.parameter_mappings,
            output_mappings: step.output_mappings,
            prompt_template_id: step.prompt_template_id
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
            }
        };

        mockData.jobs.push(newJob);
        return { ...newJob };
    },

    getJobs: (): Job[] => {
        return mockData.jobs.map(job => ({ ...job }));
    },

    getJob: (jobId: JobId): Job => {
        const job = mockData.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');
        return { ...job };
    },

    startJob: (jobId: JobId, inputVariables?: JobVariable[]): Job => {
        const jobIndex = mockData.jobs.findIndex(j => j.job_id === jobId);
        if (jobIndex === -1) throw new Error('Job not found');

        const updatedJob = {
            ...mockData.jobs[jobIndex],
            status: JobStatus.RUNNING,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            input_variables: inputVariables || mockData.jobs[jobIndex].input_variables
        };

        // Initialize execution state with input variables
        const variables: Record<WorkflowVariableName, SchemaValueType> = {};
        if (inputVariables) {
            inputVariables.forEach(v => {
                if (v.value !== undefined) {
                    variables[v.name] = v.value;
                }
            });
        }

        mockData.executionStates[jobId] = {
            job_id: jobId,
            current_step_index: 0,
            total_steps: updatedJob.steps.length,
            is_paused: false,
            live_output: '',
            status: JobStatus.RUNNING,
            step_results: [],
            variables
        };

        mockData.jobs[jobIndex] = updatedJob;
        return { ...updatedJob };
    },

    cancelJob: (jobId: JobId): Job => {
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

    deleteJob: (jobId: JobId): void => {
        mockData.jobs = mockData.jobs.filter(j => j.job_id !== jobId);
    },

    getJobExecutionState: (jobId: JobId): JobExecutionState => {
        const state = mockData.executionStates[jobId];
        if (!state) throw new Error('Job execution state not found');
        return { ...state };
    },

    executeStep: async (jobId: JobId, stepIndex: number): Promise<StepExecutionResult> => {
        const job = mockData.jobs.find(j => j.job_id === jobId);
        if (!job) throw new Error('Job not found');

        const state = mockData.executionStates[jobId];
        if (!state) throw new Error('Job execution state not found');

        const step = job.steps[stepIndex];
        if (!step) throw new Error('Step not found');

        // Create step result
        const stepResult: StepExecutionResult = {
            step_id: step.step_id,
            success: true,
            started_at: new Date().toISOString()
        };

        try {
            // Execute the tool using toolApi
            const tool = step.tool;
            if (!tool) throw new Error('No tool configured for step');

            // Prepare parameters from variable mappings
            const parameters: Record<ToolParameterName, SchemaValueType> = {};
            for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
                const value = state.variables[varName as WorkflowVariableName];
                if (value === undefined) {
                    console.warn(`Variable ${varName} not found in workflow variables`);
                }
                parameters[paramName as ToolParameterName] = value;
            }

            // Execute the tool
            const result = await toolApi.executeTool(tool.tool_id, parameters);

            // Update step result with outputs
            stepResult.outputs = result;
            stepResult.completed_at = new Date().toISOString();

            // Update execution state
            state.step_results[stepIndex] = stepResult;
            state.current_step_index = stepIndex + 1;

            // Add step outputs to the variable pool
            if (step.output_mappings) {
                if (!job.output_data) job.output_data = {};
                Object.entries(step.output_mappings).forEach(([outputName, variableName]) => {
                    if (result && outputName in result) {
                        const value = result[outputName as ToolOutputName];
                        // Update both job output data and variable pool
                        job.output_data![variableName] = value;
                        state.variables[variableName] = value;
                    }
                });
            }

            if (stepIndex + 1 >= job.steps.length) {
                state.status = JobStatus.COMPLETED;
                job.status = JobStatus.COMPLETED;
                job.completed_at = new Date().toISOString();
            }

            // Update job's execution progress
            job.execution_progress = {
                current_step: stepIndex + 1,
                total_steps: job.steps.length
            };

            // Update job's live output
            job.live_output = state.live_output;

            return stepResult;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            stepResult.completed_at = new Date().toISOString();
            stepResult.error = errorMessage;

            // Update execution state
            state.step_results[stepIndex] = stepResult;
            state.status = JobStatus.FAILED;
            job.status = JobStatus.FAILED;
            job.error_message = errorMessage;

            throw error;
        }
    },

    resetJob: (jobId: JobId): Job => {
        const jobIndex = mockData.jobs.findIndex(j => j.job_id === jobId);
        if (jobIndex === -1) throw new Error('Job not found');

        const job = mockData.jobs[jobIndex];

        // Reset the job to its initial state
        const resetJob = {
            ...job,
            status: JobStatus.PENDING,
            error_message: undefined,
            started_at: undefined,
            completed_at: undefined,
            execution_progress: {
                current_step: 0,
                total_steps: job.steps.length
            },
            live_output: undefined,
            steps: job.steps.map(step => ({
                ...step,
                status: JobStatus.PENDING,
                output_data: undefined,
                error_message: undefined,
                started_at: undefined,
                completed_at: undefined
            }))
        };

        // Clear execution state
        delete mockData.executionStates[jobId];

        // Update the job in the store
        mockData.jobs[jobIndex] = resetJob;
        return { ...resetJob };
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

    getJob: async (jobId: JobId): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get(`/api/jobs/${jobId}`);
            // return response.data;
            return mockApi.getJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    startJob: async (jobId: JobId, inputVariables?: JobVariable[]): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/start`, { input_variables: inputVariables });
            // return response.data;
            return mockApi.startJob(jobId, inputVariables);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getJobExecutionState: async (jobId: JobId): Promise<JobExecutionState> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get(`/api/jobs/${jobId}/execution-state`);
            // return response.data;
            return mockApi.getJobExecutionState(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    cancelJob: async (jobId: JobId): Promise<Job> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/cancel`);
            // return response.data;
            return mockApi.cancelJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteJob: async (jobId: JobId): Promise<void> => {
        try {
            // TODO: Replace with actual API call
            // await api.delete(`/api/jobs/${jobId}`);
            return mockApi.deleteJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    executeStep: async (jobId: JobId, stepIndex: number): Promise<StepExecutionResult> => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.post(`/api/jobs/${jobId}/steps/${stepIndex}/execute`);
            // return response.data;
            return mockApi.executeStep(jobId, stepIndex);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    resetJob: async (jobId: JobId): Promise<Job> => {
        try {
            return mockApi.resetJob(jobId);
        } catch (error) {
            throw handleApiError(error);
        }
    }
};