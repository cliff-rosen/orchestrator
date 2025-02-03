import { api, handleApiError } from './index';
import { Workflow } from '../../types/workflows';

export interface WorkflowExecutionState {
    workflowId: string;
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    variables: Record<string, any>;
    error?: string;
}

export const workflowApi = {
    getWorkflows: async (): Promise<Workflow[]> => {
        try {
            const response = await api.get('/api/workflows');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getWorkflow: async (workflowId: string): Promise<Workflow> => {
        try {
            const response = await api.get(`/api/workflows/${workflowId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    createWorkflow: async (workflow: Omit<Workflow, 'workflow_id'>): Promise<Workflow> => {
        try {
            const response = await api.post('/api/workflows', workflow);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateWorkflow: async (workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> => {
        try {
            // Transform the workflow data to match backend schema
            const transformedWorkflow = {
                name: workflow.name,
                description: workflow.description,
                status: workflow.status,
                steps: workflow.steps?.map(step => ({
                    ...step,
                    step_type: step.step_type,
                })),
                inputs: workflow.inputs?.map(input => ({
                    name: input.name,
                    description: input.description,
                    schema: input.schema,
                })),
                outputs: workflow.outputs?.map(output => ({
                    name: output.name,
                    description: output.description,
                    schema: output.schema,
                })),
            };

            const response = await api.put(`/api/workflows/${workflowId}`, transformedWorkflow);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteWorkflow: async (workflowId: string): Promise<void> => {
        try {
            await api.delete(`/api/workflows/${workflowId}`);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    addWorkflowStep: async (workflowId: string, step: any): Promise<any> => {
        try {
            const response = await api.post(`/api/workflows/${workflowId}/steps`, step);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    executeWorkflow: async (workflowId: string, executionData: any): Promise<any> => {
        try {
            const response = await api.post(`/api/workflows/${workflowId}/execute`, executionData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}; 