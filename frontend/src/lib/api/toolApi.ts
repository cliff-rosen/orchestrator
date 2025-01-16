import { Tool, ToolSignature, ToolType, ResolvedParameters, ToolOutputs, ToolParameterName, ToolOutputName } from '../../types';

// Mock tool implementations
const mockTools: Tool[] = [
    {
        id: 'echo',
        type: 'llm',
        name: 'Echo Tool',
        description: 'Echoes back the input with a prefix',
        signature: {
            parameters: [
                {
                    name: 'input',
                    type: 'string',
                    description: 'The input to echo'
                }
            ],
            outputs: [
                {
                    name: 'output',
                    type: 'string',
                    description: 'The echoed output'
                }
            ]
        }
    },
    {
        id: 'concatenate',
        type: 'llm',
        name: 'Concatenate Tool',
        description: 'Concatenates two strings',
        signature: {
            parameters: [
                {
                    name: 'first',
                    type: 'string',
                    description: 'First string'
                },
                {
                    name: 'second',
                    type: 'string',
                    description: 'Second string'
                }
            ],
            outputs: [
                {
                    name: 'result',
                    type: 'string',
                    description: 'Concatenated result'
                }
            ]
        }
    }
];

// Tool registry to store tool execution methods
const toolRegistry = new Map<string, (parameters: ResolvedParameters) => Promise<ToolOutputs>>();

// Register mock tool implementations
const registerMockTools = () => {
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
        // Register mock tools if not already registered
        if (toolRegistry.size === 0) {
            registerMockTools();
        }
        return Promise.resolve(mockTools);
    },

    // Execute a tool
    executeTool: async (toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
        const executor = getToolExecutor(toolId);
        console.log('executor', executor);
        if (!executor) {
            throw new Error(`No executor found for tool ${toolId}`);
        }
        return executor(parameters);
    }
}; 