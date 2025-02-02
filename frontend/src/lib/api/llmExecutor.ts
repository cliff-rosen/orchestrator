import { ResolvedParameters, ToolOutputName, ToolParameterName, ToolOutputs } from '../../types';
import { api } from './index';

export const executeLLM = async (parameters: ResolvedParameters): Promise<ToolOutputs> => {
    // Get the template ID from parameters
    const templateId = parameters['templateId' as ToolParameterName] as string;

    try {
        // Call the backend LLM execution endpoint
        const response = await api.post('/api/llm/execute', {
            prompt_template_id: templateId,
            parameters: parameters,
            // We could optionally pass model and max_tokens here if needed
        });

        // Return the LLM response with the correct output name
        return {
            ['response' as ToolOutputName]: response.data.response
        };
    } catch (error) {
        console.error('Error executing LLM:', error);
        throw error;
    }
}; 