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

    // Get the template ID from parameters
    const templateId = parameters['templateId' as ToolParameterName] as string;
    let res;

    try {
        // Get the template signature to identify file parameters
        const signature = await api.get(`/api/prompt-templates/${templateId}/signature`);
        const fileParameters = new Set(
            signature.data.parameters
                .filter((param: any) => param.schema.type === 'file')
                .map((param: any) => param.name)
        );

        // Split parameters into regular and file variables
        const regular_variables: Record<string, any> = {};
        const file_variables: Record<string, string> = {};

        // Remove templateId from parameters as it's not a template variable
        const paramsCopy = { ...parameters };
        delete paramsCopy['templateId' as ToolParameterName];

        // Sort parameters into regular and file variables based on signature
        Object.entries(paramsCopy).forEach(([key, paramValue]) => {
            if (fileParameters.has(key)) {
                // For file parameters, get the file_id from the nested value structure
                // First cast to unknown to avoid type errors, then to our expected type
                const fileParam = (paramValue as unknown) as { value: { file_id: string, content?: string } };
                if (!fileParam?.value?.file_id || typeof fileParam.value.file_id !== 'string' ||
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fileParam.value.file_id)) {
                    throw new Error(`Parameter '${key}' is marked as a file parameter but received an invalid file ID: ${JSON.stringify(paramValue)}`);
                }
                file_variables[key] = fileParam.value.file_id;
            } else {
                // For non-file parameters, check if it's a wrapped value
                const wrappedValue = (paramValue as unknown) as { value: any };
                regular_variables[key] = wrappedValue?.value !== undefined ? wrappedValue.value : paramValue;
            }
        });

        // Call the backend LLM execution endpoint
        const response = await api.post('/api/execute_llm', {
            prompt_template_id: templateId,
            regular_variables,
            file_variables,
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