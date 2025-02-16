import { ResolvedParameters, ToolOutputName, ToolParameterName, ToolOutputs } from '../../types';
import { api } from './index';
import { searchApi } from './searchApi';

// Execute search tool function
export const executeSearch = async (parameters: ResolvedParameters): Promise<ToolOutputs> => {
    const query = parameters['query' as ToolParameterName] as string;
    try {
        const searchResults = await searchApi.search(query);
        return {
            ['results' as ToolOutputName]: searchResults.map(result => `${result.title}\n${result.snippet}`)
        };
    } catch (error) {
        console.error('Error executing search:', error);
        throw error;
    }
};

// Execute LLM tool function
export const executeLLM = async (parameters: ResolvedParameters): Promise<ToolOutputs> => {
    console.log('Executing LLM with parameters:', parameters);

    // Get the required parameters
    const templateId = parameters['prompt_template_id'] as string;
    const regular_variables = parameters['regular_variables'] as Record<string, any>;
    const file_variables = parameters['file_variables'] as Record<string, string>;
    let res;

    try {
        // Call the backend LLM execution endpoint
        const response = await api.post('/api/execute_llm', {
            prompt_template_id: templateId,
            regular_variables,
            file_variables,
        });

        // Handle the response
        if (typeof response.data.response === 'object') {
            res = Object.entries(response.data.response).reduce((acc, [key, value]) => {
                acc[key as ToolOutputName] = value as string | number | boolean | string[];
                return acc;
            }, {} as ToolOutputs);
        } else {
            res = response.data.response;
        }

        return {
            ['response' as ToolOutputName]: res
        };
    } catch (error: any) {
        console.error('Error executing LLM:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            window.location.href = '/login';
            throw new Error('Please log in to continue');
        }
        throw error;
    }
}; 