export interface PromptTemplateOutputField {
    type: string;
    description?: string;
}

export interface PromptTemplateOutputSchema {
    type: 'object' | 'string';
    description: string;
    schema?: {
        type: 'object';
        fields: Record<string, PromptTemplateOutputField>;
    };
}

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