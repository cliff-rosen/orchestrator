import { SchemaValue } from './schema';
export type { SchemaValue } from './schema';

export interface PromptTemplateToken {
    name: string;
    type: 'string' | 'file';
}

export interface PromptTemplate {
    template_id: string;
    name: string;
    description?: string;
    user_message_template: string;
    system_message_template?: string;
    tokens: PromptTemplateToken[];
    output_schema: SchemaValue;
    created_at: string;
    updated_at: string;
}

export interface PromptTemplateCreate {
    name: string;
    description?: string;
    user_message_template: string;
    system_message_template?: string;
    tokens: PromptTemplateToken[];
    output_schema: SchemaValue;
}

export interface PromptTemplateUpdate extends PromptTemplateCreate {
    template_id: string;
}

export interface PromptTemplateTest {
    user_message_template: string;
    system_message_template?: string;
    tokens: PromptTemplateToken[];
    parameters: Record<string, any>;
    output_schema: SchemaValue;
}

export interface LLMExecuteRequest {
    prompt_template_id: string;
    regular_variables: Record<string, any>;
    file_variables: Record<string, string>;  // Maps variable name to file ID
    model?: string;
    max_tokens?: number;
}

export type MessageContent = {
    type: 'text';
    text: string;
} | {
    type: 'image_url';
    image_url: string;
};

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string | MessageContent[];
}

export interface LLMExecuteResponse {
    template_id: string;
    messages: Message[];
    response: any;
}

export interface PromptTemplateOutputField {
    type: string;
    description?: string;
}

export interface PromptTemplateOutput {
    description?: string;
    fields: PromptTemplateOutputField[];
}

export type PromptTemplateOutputSchema = {
    type: 'string';
    description?: string;
} | {
    type: 'object';
    description?: string;
    fields: {
        [key: string]: {
            type: string;
            description?: string;
        }
    }
}; 