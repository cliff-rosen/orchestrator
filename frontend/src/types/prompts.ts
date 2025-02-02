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
    id: string;
    name: string;
    description: string;
    template: string;
    tokens: string[];
    output_schema: PromptTemplateOutputSchema;
    created_at: string;
    updated_at: string;
} 