import { ResolvedParameters, ToolOutputName, ToolOutputs } from '../../types';
import { api } from './index';
import { searchApi } from './searchApi';
import { SchemaValueType } from '../../types/schema';

// Execute search tool function
export const executeSearch = async (parameters: ResolvedParameters): Promise<ToolOutputs> => {
    const query = (parameters as Record<string, string>)['query'];
    try {
        const searchResults = await searchApi.search(query);
        return {
            ['results' as ToolOutputName]: searchResults as unknown as SchemaValueType
        };
    } catch (error) {
        console.error('Error executing search:', error);
        throw error;
    }
};

// Execute PubMed search tool function
export const executePubMedSearch = async (parameters: ResolvedParameters): Promise<ToolOutputs> => {
    console.log('Executing PubMed search with parameters:', parameters);
    const query = (parameters as Record<string, string>)['query'];
    try {
        const response = await api.get('/api/pubmed/search', { params: { query } });
        const articles = response.data;

        // Format each article into a structured result
        const formattedResults = articles.map((article: any) =>
            `Title: ${article.title}\n` +
            `Journal: ${article.journal}\n` +
            `Date: ${article.publication_date}\n` +
            `Abstract: ${article.abstract}\n` +
            `URL: ${article.url}`
        );

        return {
            ['results' as ToolOutputName]: formattedResults
        };
    } catch (error) {
        console.error('Error executing PubMed search:', error);
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

    try {
        // Call the backend LLM execution endpoint
        const response = await api.post('/api/execute_llm', {
            prompt_template_id: templateId,
            regular_variables,
            file_variables,
        });

        console.log('LLM response:', response.data);


        const finalResponse = {
            ['result' as ToolOutputName]: response.data.response
        };

        console.log('Final response:', finalResponse);

        return finalResponse;

    } catch (error: any) {
        console.error('Error executing LLM:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            window.location.href = '/login';
            throw new Error('Please log in to continue');
        }
        throw error;
    }
};



