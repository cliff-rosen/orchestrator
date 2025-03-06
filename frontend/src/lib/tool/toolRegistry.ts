import { ResolvedParameters, ToolOutputName, ToolOutputs } from '../../types/tools';
import { SchemaValueType } from '../../types/schema';
import { executeSearch, executePubMedSearch, executeLLM } from './toolExecutors';

// Tool registry to store tool execution methods
const toolRegistry = new Map<string, (toolId: string, parameters: ResolvedParameters) => Promise<ToolOutputs>>();

// Function to register a tool's execution method
export const registerToolExecutor = (toolId: string, executor: (toolId: string, parameters: ResolvedParameters) => Promise<ToolOutputs>) => {
    toolRegistry.set(toolId, executor);
};

// Function to execute a tool by ID
export const executeTool = async (toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
    const executor = toolRegistry.get(toolId);
    if (!executor) {
        throw new Error(`No executor registered for tool ${toolId}`);
    }
    return await executor(toolId, parameters);
};

// Tool type definitions
export const TOOL_TYPES = [
    {
        tool_type_id: 'llm',
        name: 'LLM',
        description: '',
        icon: '🤖',
        requiresTemplate: true
    },
    {
        tool_type_id: 'search',
        name: 'Search',
        description: '',
        icon: '🔍',
        tools: [
            { tool_id: 'search', name: 'Web Search', description: 'Search the web for information' },
            { tool_id: 'pubmed', name: 'PubMed Search', description: 'Search PubMed for medical research papers' }]
    },
    {
        tool_type_id: 'api',
        name: 'API',
        description: '',
        icon: '🔌',
        tools: [
            { tool_id: 'rest-api', name: 'REST API', description: 'Make REST API calls' },
            { tool_id: 'graphql', name: 'GraphQL', description: 'Execute GraphQL queries' }
        ]
    },
    {
        tool_type_id: 'utility',
        name: 'Utils',
        description: '',
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
    registerToolExecutor('echo', async (toolId: string, parameters: ResolvedParameters) => {
        const input = (parameters as Record<string, string>)['input'];
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { ['output' as ToolOutputName]: `${input}` as SchemaValueType };
    });

    registerToolExecutor('concatenate', async (toolId: string, parameters: ResolvedParameters) => {
        const first = (parameters as Record<string, string>)['first'];
        const second = (parameters as Record<string, string>)['second'];
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { ['result' as ToolOutputName]: `${first}${second}` as SchemaValueType };
    });
};

// Initialize tool executors
registerAllTools(); 