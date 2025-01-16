import { api, handleApiError } from './index';
import { Tool, ToolSignature, ToolType } from '../../types/tools';
import { PromptTemplate } from '../../types/prompts';
import { TOOL_SIGNATURES, PROMPT_TEMPLATES } from '../../data';

export const toolApi = {
    getToolSignature: async (toolType: ToolType, promptTemplate?: string): Promise<ToolSignature> => {
        // Use hardcoded tool signatures
        if (toolType === 'llm') {
            return Promise.resolve(TOOL_SIGNATURES.llm(promptTemplate));
        }
        return Promise.resolve(TOOL_SIGNATURES[toolType]);
    },

    getPromptTemplates: async (): Promise<PromptTemplate[]> => {
        // Return hardcoded prompt templates
        return Promise.resolve([...PROMPT_TEMPLATES]);
    },

    getAvailableTools: async (): Promise<Tool[]> => {
        // Return hardcoded tools based on TOOL_SIGNATURES
        const tools: Tool[] = Object.entries(TOOL_SIGNATURES).map(([type, signature]) => ({
            type: type as ToolType,
            name: `${type} Tool`,
            description: type === 'llm'
                ? 'Language model tool with configurable prompts'
                : `Default ${type} tool configuration`
        }));
        return Promise.resolve(tools);
    }
}; 