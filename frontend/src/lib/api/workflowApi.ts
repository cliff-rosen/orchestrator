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
            return response.data.map((workflow: any) => ({
                ...workflow,
                inputs: workflow.variables?.filter((v: any) => v.variable_type === 'input') || [],
                outputs: workflow.variables?.filter((v: any) => v.variable_type === 'output') || []
            }));
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getWorkflow: async (workflowId: string): Promise<Workflow> => {
        try {
            const response = await api.get(`/api/workflows/${workflowId}`);
            return response.data
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
                    tool_id: step.tool?.tool_id,
                    prompt_template: step.prompt_template,
                })),
                inputs: workflow.inputs?.map(input => ({
                    variable_id: input.variable_id,
                    name: input.name,
                    description: input.description,
                    schema: input.schema,
                })),
                outputs: workflow.outputs?.map(output => ({
                    variable_id: output.variable_id,
                    name: output.name,
                    description: output.description,
                    schema: output.schema,
                })),
            };

            const response = await api.put(`/api/workflows/${workflowId}`, transformedWorkflow);
            return {
                ...response.data,
                inputs: response.data.variables?.filter((v: any) => v.variable_type === 'input') || [],
                outputs: response.data.variables?.filter((v: any) => v.variable_type === 'output') || []
            };
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