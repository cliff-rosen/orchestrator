import { Tool, ToolSignature, ResolvedParameters, ToolOutputs, ToolParameterName, ToolOutputName } from '../../types';
import { PromptTemplate } from '../../types/prompts';
import { api, handleApiError } from './index';
import { PrimitiveValue, ValueType } from '../../hooks/schema/types';
import { executeLLM } from './llmExecutor';

// Cache for tools and prompt templates
let toolsCache: Tool[] | null = null;
let promptTemplatesCache: PromptTemplate[] | null = null;

// Tool registry to store tool execution methods
const toolRegistry = new Map<string, (parameters: ResolvedParameters) => Promise<ToolOutputs>>();

// Register utility tool implementations
const registerUtilityTools = () => {
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

    // Search tool
    registerToolExecutor('search', async (parameters: ResolvedParameters) => {
        const query = parameters['query' as ToolParameterName] as string;
        // TODO: Implement actual search functionality
        return {
            ['results' as ToolOutputName]: [`Mock search result for: ${query}`]
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

    // LLM tool
    registerToolExecutor('llm', executeLLM);
};

// Function to register a tool's execution method
export const registerToolExecutor = (toolId: string, executor: (parameters: ResolvedParameters) => Promise<ToolOutputs>) => {
    toolRegistry.set(toolId, executor);
};

// Function to get a tool's execution method
export const getToolExecutor = (toolId: string) => {
    return toolRegistry.get(toolId);
};

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

    // Clear the cache (useful when we need to force a refresh)
    clearCache: () => {
        toolsCache = null;
        promptTemplatesCache = null;
    },

    // Update LLM tool signature based on selected template
    updateLLMSignature: async (templateId: string): Promise<ToolSignature> => {
        const templates = await toolApi.getPromptTemplates();
        const template = templates.find((t: PromptTemplate) => t.template_id === templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Convert prompt tokens to tool parameters
        const parameters = template.tokens.map((token: string) => ({
            name: token,
            description: `Value for {{${token}}} in the prompt`,
            schema: {
                name: token,
                type: 'string' as const
            } as PrimitiveValue
        }));

        // Convert prompt output schema to tool output parameters
        const outputs = template.output_schema.type === 'object' && template.output_schema.schema
            ? Object.entries(template.output_schema.schema.fields).map(([key, field]: [string, { description?: string; type: string }]) => ({
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