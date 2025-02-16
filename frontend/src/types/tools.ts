import { SchemaValue } from './schema';

export type ToolType = 'llm' | 'search' | 'retrieve' | 'utility';

export interface ToolParameter {
    name: string;
    description?: string;
    schema: SchemaValue;
}

export interface ToolSignature {
    parameters: ToolParameter[];
    outputs: ToolParameter[];
}

// Tool and workflow variable names as branded types
export type ToolParameterName = string & { readonly __brand: unique symbol };
export type ToolOutputName = string & { readonly __brand: unique symbol };
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Mapping types with semantic meaning
export type ParameterMappingType = Record<ToolParameterName, WorkflowVariableName>;    // from tool parameter -> to workflow variable
export type OutputMappingType = Record<ToolOutputName, WorkflowVariableName>;          // from tool output -> to workflow variable

// Type for resolved parameter values
export type ResolvedParameterValue = {
    value: string | number | boolean | string[] | { file_id: string; content?: string };
};

export type ResolvedParameters = Record<ToolParameterName, ResolvedParameterValue>;

// Type for tool outputs
export type ToolOutputs = Record<ToolOutputName, string | number | boolean | string[]>;

export interface Tool {
    tool_id: string;
    tool_type: ToolType;
    name: string;
    description: string;
    signature: ToolSignature;
} 