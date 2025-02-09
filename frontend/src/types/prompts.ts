export interface PromptTemplateOutputField {
    type: string;
    description?: string;
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

export interface PromptTemplate {
    template_id: string;
    name: string;
    description: string;
    template: string;  // The template is always a string with {{variable}} placeholders
    tokens: string[];
    output_schema: PromptTemplateOutputSchema;
    created_at: string;
    updated_at: string;
} 