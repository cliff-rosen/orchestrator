import { api, handleApiError } from './index';
import { Workflow } from '../../types/workflows';
import { StreamUpdate } from './streamUtils';
import { makeStreamRequest } from './streamUtils';
import { WORKFLOWS } from '../../data';

export interface WorkflowExecutionState {
    workflowId: string;
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    variables: Record<string, any>;
    error?: string;
}

export const workflowApi = {
    getWorkflows: async (): Promise<Workflow[]> => {
        // Return hardcoded workflows for now
        return Promise.resolve([...WORKFLOWS]);
    },

    getWorkflow: async (workflowId: string): Promise<Workflow> => {
        // Find workflow in hardcoded data
        const workflow = WORKFLOWS.find(w => w.id === workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        return Promise.resolve(workflow);
    },

}; 