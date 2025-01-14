export type ToolType = 'llm' | 'search' | 'retrieve';

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'string[]';
    description?: string;
}

export interface ToolSignature {
    parameters: ToolParameter[];
    outputs: ToolParameter[];
}

export interface Tool {
    type: ToolType;
    name?: string;
    description?: string;
    parameterMappings?: Record<string, string>;
    outputMappings?: Record<string, string>;
    promptTemplate?: string;  // ID of the selected prompt template
} 