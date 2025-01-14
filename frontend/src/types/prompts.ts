export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    template: string;
    tokens: string[];
    output: {
        type: 'string' | 'string[]' | 'object';
        description: string;
        schema?: {
            type: 'object';
            fields: Record<string, {
                type: 'string' | 'number' | 'boolean' | 'string[]';
                description?: string;
            }>;
        };
    };
} 