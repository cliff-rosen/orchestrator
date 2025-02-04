import { api, handleApiError } from './index';
import { Workflow } from '../../types/workflows';
import { toolApi } from './toolApi';

export interface WorkflowExecutionState {
    workflowId: string;
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    variables: Record<string, any>;
    error?: string;
}

// Cache tools to avoid repeated fetches
let toolsCache: Record<string, any> = {};

const reconstructWorkflowWithTools = async (workflow: any): Promise<Workflow> => {
    // Fetch tools if cache is empty
    if (Object.keys(toolsCache).length === 0) {
        const tools = await toolApi.getAvailableTools();
        toolsCache = tools.reduce((acc: Record<string, any>, tool: any) => {
            acc[tool.tool_id] = tool;
            return acc;
        }, {});
    }

    // Reconstruct steps with tool objects
    const stepsWithTools = workflow.steps?.map((step: any) => ({
        ...step,
        tool: step.tool_id ? toolsCache[step.tool_id] : undefined
        // prompt_template stays at the step level, not added to tool
    }));

    return {
        ...workflow,
        steps: stepsWithTools || []
    };
};

export const workflowApi = {
    getWorkflows: async (): Promise<Workflow[]> => {
        try {
            const response = await api.get('/api/workflows');
            const workflows = await Promise.all(
                response.data.map(reconstructWorkflowWithTools)
            );
            return workflows;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getWorkflow: async (workflowId: string): Promise<Workflow> => {
        try {
            const response = await api.get(`/api/workflows/${workflowId}`);
            return await reconstructWorkflowWithTools(response.data);
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
    },

    // Export the reconstructWorkflowWithTools function
    reconstructWorkflowWithTools
}; 