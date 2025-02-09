import { ResolvedParameters, ToolOutputName, ToolParameterName, ToolOutputs } from '../../types';
import { api } from './index';

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

    } catch (error) {
        console.error('Error executing LLM:', error);
        throw error;
    }
}; 