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
    // Get the template ID from parameters
    const templateId = parameters['templateId' as ToolParameterName] as string;
    let res;

    try {
        // Call the backend LLM execution endpoint
        const response = await api.post('/api/llm/execute', {
            prompt_template_id: templateId,
            parameters: parameters,
            // We could optionally pass model and max_tokens here if needed
        });

        // If the response is a JSON object, return it directly as the outputs
        // This assumes the JSON keys match the expected output names
        if (typeof response.data.response === 'object') {
            res = Object.entries(response.data.response).reduce((acc, [key, value]) => {
                // Assert that value is one of the allowed types for ToolOutputs
                acc[key as ToolOutputName] = value as string | number | boolean | string[];
                return acc;
            }, {} as ToolOutputs);
        }
        else {
            res = response.data.response;
        }

        // If it's a string, return it under the 'response' key
        return {
            ['response' as ToolOutputName]: res
        };
    } catch (error: any) {
        console.error('Error executing LLM:', error);

        // Check if error is due to validation/authentication
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Redirect to login page
            window.location.href = '/login';
            throw new Error('Please log in to continue');
        }

        throw error;
    }
}; 