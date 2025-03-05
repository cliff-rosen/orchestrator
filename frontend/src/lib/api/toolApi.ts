import { Tool, ToolSignature, ToolOutputName, ToolParameterName } from '../../types/tools';
import { PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../../types/prompts';
import { api, handleApiError } from './index';
import { WorkflowStep } from '../../types/workflows';
// Caches for tools and prompt templates    
let toolsCache: Tool[] | null = null;
let promptTemplatesCache: PromptTemplate[] | null = null;

////// Tool API functions //////

export const toolApi = {
    getTools: async (): Promise<Tool[]> => {
        const response = await api.get('/api/tools');
        return response.data;
    },

    getTool: async (toolId: string): Promise<Tool> => {
        const response = await api.get(`/api/tools/${toolId}`);
        return response.data;
    },

    getPromptTemplates: async (): Promise<PromptTemplate[]> => {
        const response = await api.get('/api/prompt-templates');
        return response.data;
    },

    getPromptTemplate: async (templateId: string): Promise<PromptTemplate> => {
        const response = await api.get(`/api/prompt-templates/${templateId}`);
        return response.data;
    },

    createPromptTemplate: async (template: PromptTemplateCreate): Promise<PromptTemplate> => {
        const response = await api.post('/api/prompt-templates', template);
        return response.data;
    },

    updatePromptTemplate: async (templateId: string, template: PromptTemplateUpdate): Promise<PromptTemplate> => {
        const response = await api.put(`/api/prompt-templates/${templateId}`, template);
        return response.data;
    },

    deletePromptTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/api/prompt-templates/${templateId}`);
    },

    testPromptTemplate: async (templateId: string, testData: PromptTemplateTest): Promise<any> => {
        const response = await api.post(`/api/prompt-templates/test`, testData);
        return response.data;
    },

    createToolSignatureFromTemplate: async (templateId: string): Promise<ToolSignature> => {
        const response = await api.get(`/api/prompt-templates/${templateId}/signature`);
        return response.data;
    },

    // Clear the cache (useful when we need to force a refresh)
    clearCache: () => {
        toolsCache = null;
        promptTemplatesCache = null;
    },

    // Update workflow step with new prompt template
    updateWorkflowStepWithTemplate: async (step: WorkflowStep, templateId: string): Promise<WorkflowStep> => {
        if (!step.tool) {
            throw new Error('Step must have a tool to update with template');
        }

        const signature = await toolApi.createToolSignatureFromTemplate(templateId);

        // Only clear mappings if the parameters/outputs have changed
        const parameterMappings = { ...step.parameter_mappings };
        const outputMappings = { ...step.output_mappings };

        // Clear parameter mappings for parameters that no longer exist
        if (step.parameter_mappings) {
            Object.keys(step.parameter_mappings).forEach(param => {
                if (!signature.parameters.find(p => p.name === param)) {
                    delete parameterMappings[param as ToolParameterName];
                }
            });
        }

        // Clear output mappings for outputs that no longer exist
        if (step.output_mappings) {
            Object.keys(step.output_mappings).forEach(output => {
                if (!signature.outputs.find(o => o.name === output)) {
                    delete outputMappings[output as ToolOutputName];
                }
            });
        }

        return {
            ...step,
            prompt_template_id: templateId,
            parameter_mappings: parameterMappings,
            output_mappings: outputMappings,
            tool: {
                ...step.tool,
                signature
            }
        };
    }
}; 