import { Tool, ToolSignature, ResolvedParameters, ToolOutputs, ToolParameterName, ToolOutputName } from '../../types';
import { PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../../types/prompts';

import { WorkflowStep } from '../../types/workflows';
import { api, handleApiError } from './index';
import { executeLLM, executeSearch } from './toolExecutors';

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

////// Tool executor functions //////

// Register utility tool implementations
const registerUtilityTools = () => {
    // LLM tool
    registerToolExecutor('llm', executeLLM);

    // Search tool
    registerToolExecutor('search', executeSearch);

    // Echo tool
    registerToolExecutor('echo', async (parameters: ResolvedParameters) => {
        const input = parameters['input' as ToolParameterName] as string;
        return {
            ['output' as ToolOutputName]: `Echo: ${input}`
        };
    });

    // Concatenate tool
    registerToolExecutor('concatenate', async (parameters: ResolvedParameters) => {
        const first = parameters['first' as ToolParameterName] as string;
        const second = parameters['second' as ToolParameterName] as string;
        return {
            ['result' as ToolOutputName]: `${first}${second}`
        };
    });

    // Retrieve tool
    registerToolExecutor('retrieve', async (parameters: ResolvedParameters) => {
        const urls = parameters['urls' as ToolParameterName] as string[];
        // TODO: Implement actual URL content retrieval
        return {
            ['contents' as ToolOutputName]: urls.map(url => `Mock content from: ${url}`)
        };
    });
};

// Initialize tool executors
registerUtilityTools();

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
            { tool_id: 'doc-search', name: 'Document Search', description: 'Search through document repositories' }
        ]
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