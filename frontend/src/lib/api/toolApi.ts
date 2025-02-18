import { Tool, ToolSignature, ResolvedParameters, ToolOutputs, ToolOutputName } from '../../types';
import { PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../../types/prompts';

import { WorkflowStep } from '../../types/workflows';
import { api, handleApiError } from './index';
import { executeLLM, executeSearch, executePubMedSearch } from './toolExecutors';

// Caches for tools and prompt templates    
let toolsCache: Tool[] | null = null;
let promptTemplatesCache: PromptTemplate[] | null = null;

// Tool registry to store tool execution methods
const toolRegistry = new Map<string, (parameters: ResolvedParameters) => Promise<ToolOutputs>>();

// Function to register a tool's execution method
export const registerToolExecutor = (toolId: string, executor: (parameters: ResolvedParameters) => Promise<ToolOutputs>) => {
    toolRegistry.set(toolId, executor);
};

// Function to get a tool's execution method
export const getToolExecutor = (toolId: string) => {
    return toolRegistry.get(toolId);
};

// Tool type definitions
export const TOOL_TYPES = [
    {
        tool_type_id: 'llm',
        name: 'LLM',
        description: 'Language Model tools for text generation and processing',
        icon: '🤖',
        requiresTemplate: true
    },
    {
        tool_type_id: 'search',
        name: 'Search',
        description: 'Tools for searching and retrieving information',
        icon: '🔍',
        tools: [
            { tool_id: 'search', name: 'Web Search', description: 'Search the web for information' },
            { tool_id: 'pubmed', name: 'PubMed Search', description: 'Search PubMed for medical research papers' }]
    },
    {
        tool_type_id: 'api',
        name: 'API',
        description: 'External API integrations and data processing',
        icon: '🔌',
        tools: [
            { tool_id: 'rest-api', name: 'REST API', description: 'Make REST API calls' },
            { tool_id: 'graphql', name: 'GraphQL', description: 'Execute GraphQL queries' }
        ]
    },
    {
        tool_type_id: 'utility',
        name: 'Utils',
        description: 'Utility tools for basic operations',
        icon: '🛠️',
        tools: [
            { tool_id: 'echo', name: 'Echo', description: 'Echo input to output' },
            { tool_id: 'concatenate', name: 'Cat', description: 'Concatenate inputs' }
        ]
    }
];

// Register all tool executors
const registerAllTools = () => {
    // Core tools
    registerToolExecutor('llm', executeLLM);
    registerToolExecutor('search', executeSearch);
    registerToolExecutor('pubmed', executePubMedSearch);

    // Utility tools
    registerToolExecutor('echo', async (parameters: ResolvedParameters) => {
        const input = (parameters as Record<string, string>)['input'];
        // Add delay for echo tool
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            ['output' as ToolOutputName]: `Echo: ${input}`
        };
    });

    registerToolExecutor('concatenate', async (parameters: ResolvedParameters) => {
        const first = (parameters as Record<string, string>)['first'];
        const second = (parameters as Record<string, string>)['second'];
        // Add delay for cat tool
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            ['result' as ToolOutputName]: `${first}${second}`
        };
    });

    registerToolExecutor('retrieve', async (parameters: ResolvedParameters) => {
        const urls = (parameters as Record<string, string[]>)['urls'];
        return {
            ['contents' as ToolOutputName]: urls.map(url => `Mock content from: ${url}`)
        };
    });
};

// Initialize tool executors
registerAllTools();

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

    // Execute a tool
    executeTool: async (toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
        const executor = getToolExecutor(toolId);
        if (!executor) {
            throw new Error(`No executor found for tool ${toolId}`);
        }
        return executor(parameters);
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
                    delete parameterMappings[param];
                }
            });
        }

        // Clear output mappings for outputs that no longer exist
        if (step.output_mappings) {
            Object.keys(step.output_mappings).forEach(output => {
                if (!signature.outputs.find(o => o.name === output)) {
                    delete outputMappings[output];
                }
            });
        }

        return {
            ...step,
            prompt_template: templateId,
            parameter_mappings: parameterMappings,
            output_mappings: outputMappings,
            tool: {
                ...step.tool,
                signature
            }
        };
    }
}; 