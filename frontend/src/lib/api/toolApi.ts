import { Tool, ToolSignature, ResolvedParameters, ToolOutputs, ToolParameterName, ToolOutputName } from '../../types';
import { PromptTemplate } from '../../types/prompts';
import { PrimitiveValue, ValueType } from '../../types/schema';
import { api, handleApiError } from './index';
import { executeLLM, executeSearch } from './toolExecutors';

// Caches for tools and prompt templates    
let toolsCache: Tool[] | null = null;
let promptTemplatesCache: PromptTemplate[] | null = null;

// Tool registry to store tool execution methods
const toolRegistry = new Map<string, (parameters: ResolvedParameters) => Promise<ToolOutputs>>();

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

// Function to register a tool's execution method
export const registerToolExecutor = (toolId: string, executor: (parameters: ResolvedParameters) => Promise<ToolOutputs>) => {
    toolRegistry.set(toolId, executor);
};

// Function to get a tool's execution method
export const getToolExecutor = (toolId: string) => {
    return toolRegistry.get(toolId);
};

////// Tool API functions //////

export const toolApi = {
    // Get all available tools with their signatures
    getAvailableTools: async (): Promise<Tool[]> => {
        // Use cache if available
        if (toolsCache) {
            return toolsCache;
        }

        try {
            const response = await api.get('/api/tools');
            const tools = response.data;

            // Register tool executors if not already registered
            if (toolRegistry.size === 0) {
                registerUtilityTools();
            }

            // Cache the tools
            toolsCache = tools;
            return tools;
        } catch (error) {
            console.error('Error fetching tools:', handleApiError(error));
            throw error;
        }
    },

    // Execute a tool
    executeTool: async (toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
        const executor = getToolExecutor(toolId);
        if (!executor) {
            throw new Error(`No executor found for tool ${toolId}`);
        }
        return executor(parameters);
    },

    // Get available prompt templates
    getPromptTemplates: async (): Promise<PromptTemplate[]> => {
        // Use cache if available
        if (promptTemplatesCache) {
            return promptTemplatesCache;
        }

        try {
            const response = await api.get('/api/prompt-templates');
            const templates = response.data;

            // Cache the templates
            promptTemplatesCache = templates;
            return templates;
        } catch (error) {
            console.error('Error fetching prompt templates:', handleApiError(error));
            throw error;
        }
    },

    // Create a new prompt template
    createPromptTemplate: async (templateData: Partial<PromptTemplate>): Promise<PromptTemplate> => {
        try {
            const response = await api.post('/api/prompt-templates', templateData);

            // Clear cache to ensure fresh data
            promptTemplatesCache = null;

            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Update an existing prompt template
    updatePromptTemplate: async (templateId: string, templateData: Partial<PromptTemplate>): Promise<PromptTemplate> => {
        try {
            const response = await api.put(`/api/prompt-templates/${templateId}`, templateData);

            // Clear cache to ensure fresh data
            promptTemplatesCache = null;

            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Delete a prompt template
    deletePromptTemplate: async (templateId: string): Promise<void> => {
        try {
            await api.delete(`/api/prompt-templates/${templateId}`);

            // Clear cache to ensure fresh data
            promptTemplatesCache = null;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Test a prompt template
    testPromptTemplate: async (templateData: Partial<PromptTemplate>, parameters: Record<string, string>): Promise<any> => {
        try {
            const response = await api.post('/api/prompt-templates/test', {
                template: templateData.template,
                tokens: templateData.tokens,
                output_schema: templateData.output_schema,
                parameters
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Get a specific prompt template
    getPromptTemplate: async (templateId: string): Promise<PromptTemplate> => {
        try {
            const response = await api.get(`/api/prompt-templates/${templateId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    // Clear the cache (useful when we need to force a refresh)
    clearCache: () => {
        toolsCache = null;
        promptTemplatesCache = null;
    },

    // Create tool signature based on prompt template
    createToolSignatureFromTemplate: async (templateId: string): Promise<ToolSignature> => {
        console.log('Creating tool signature from template:', templateId);
        const template = await toolApi.getPromptTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Convert prompt tokens to tool parameters (handle case where there are no tokens)
        const parameters = template.tokens?.length > 0
            ? template.tokens.map((token: string) => ({
                name: token,
                description: `Value for {{${token}}} in the prompt`,
                schema: {
                    name: token,
                    type: 'string' as const
                } as PrimitiveValue
            }))
            : [];

        // Convert prompt output schema to tool output parameters
        const outputs = template.output_schema.type === 'object' && template.output_schema.fields
            ? Object.entries(template.output_schema.fields as Record<string, { description?: string; type: string }>).map(([key, field]) => ({
                name: key,
                description: field.description || '',
                schema: {
                    name: key,
                    type: field.type as ValueType
                } as PrimitiveValue
            }))
            : [{
                name: 'response',
                description: template.output_schema.description,
                schema: {
                    name: 'response',
                    type: template.output_schema.type as ValueType
                } as PrimitiveValue
            }];

        return { parameters, outputs };
    }
}; 