import { Tool, ToolSignature, ToolType, ResolvedParameters, ToolOutputs, ToolParameterName, ToolOutputName } from '../../types';
import { TOOL_SIGNATURES, PROMPT_TEMPLATES } from '../../data';

// Utility tools and core tools combined
const utilityTools: Tool[] = [
    {
        id: 'echo',
        type: 'utility',
        name: 'Echo Tool',
        description: 'Echoes back the input with a prefix',
        signature: {
            parameters: [
                {
                    name: 'input',
                    description: 'The input to echo',
                    schema: {
                        name: 'input',
                        type: 'string'
                    }
                }
            ],
            outputs: [
                {
                    name: 'output',
                    description: 'The echoed output',
                    schema: {
                        name: 'output',
                        type: 'string'
                    }
                }
            ]
        }
    },
    {
        id: 'concatenate',
        type: 'utility',
        name: 'Concatenate Tool',
        description: 'Concatenates two strings',
        signature: {
            parameters: [
                {
                    name: 'first',
                    description: 'First string',
                    schema: {
                        name: 'first',
                        type: 'string'
                    }
                },
                {
                    name: 'second',
                    description: 'Second string',
                    schema: {
                        name: 'second',
                        type: 'string'
                    }
                }
            ],
            outputs: [
                {
                    name: 'result',
                    description: 'Concatenated result',
                    schema: {
                        name: 'result',
                        type: 'string'
                    }
                }
            ]
        }
    },
    {
        id: 'search',
        type: 'search',
        name: 'Search Tool',
        description: 'Performs a web search',
        signature: TOOL_SIGNATURES.search
    },
    {
        id: 'retrieve',
        type: 'retrieve',
        name: 'Retrieve Tool',
        description: 'Retrieves content from URLs',
        signature: TOOL_SIGNATURES.retrieve
    },
    {
        id: 'llm',
        type: 'llm',
        name: 'Language Model',
        description: 'Executes prompts using a language model',
        signature: {
            parameters: [],  // Will be populated when template is selected
            outputs: []     // Will be populated when template is selected
        }
    }
];

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
    registerToolExecutor('llm', async (parameters: ResolvedParameters) => {
        // Get the template ID from parameters
        const templateId = parameters['templateId' as ToolParameterName] as string;
        const template = PROMPT_TEMPLATES.find(t => t.id === templateId);

        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Get the parameter values based on the template's tokens
        const paramValues = template.tokens.map(token =>
            parameters[token as ToolParameterName] as string
        );

        // Get the signature for this template
        const signature = TOOL_SIGNATURES.llm(templateId);

        // Create mock output based on the template's output schema
        let mockOutput: any;
        if (template.output.type === 'object' && template.output.schema) {
            mockOutput = {};
            Object.entries(template.output.schema.fields).forEach(([key, field]) => {
                mockOutput[key] = `Mock ${field.description || key} for template ${templateId} with params: ${paramValues.join(', ')}`;
            });
        } else {
            mockOutput = `Mock ${template.output.description || 'response'} for template ${templateId} with params: ${paramValues.join(', ')}`;
        }

        // Return the output with the correct output name from the signature
        const outputName = signature.outputs[0].name;
        return {
            [outputName as ToolOutputName]: mockOutput
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

export const toolApi = {
    // Get all available tools with their signatures
    getAvailableTools: async (): Promise<Tool[]> => {
        // Register utility tools if not already registered
        if (toolRegistry.size === 0) {
            registerUtilityTools();
        }
        return Promise.resolve(utilityTools);
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
    getPromptTemplates: async () => {
        return Promise.resolve(PROMPT_TEMPLATES);
    },

    // Update LLM tool signature based on selected template
    updateLLMSignature: (templateId: string): ToolSignature => {
        return TOOL_SIGNATURES.llm(templateId);
    }
}; 