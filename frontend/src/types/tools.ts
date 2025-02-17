import { SchemaValue, SchemaValueType } from './schema';

export type ToolType = 'llm' | 'search' | 'retrieve' | 'utility';

export interface ToolParameter {
    schema: SchemaValue;
    required?: boolean;
    default?: any;
}

export interface ToolOutput {
    schema: SchemaValue;
}

export interface ToolSignature {
    parameters: ToolParameter[];
    outputs: ToolOutput[];
}

// Tool and workflow variable names as branded types
export type ToolParameterName = string & { readonly __brand: unique symbol };
export type ToolOutputName = string & { readonly __brand: unique symbol };
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Mapping types with semantic meaning
export type ParameterMappingType = Record<ToolParameterName, WorkflowVariableName>;    // from tool parameter -> to workflow variable
export type OutputMappingType = Record<ToolOutputName, WorkflowVariableName>;          // from tool output -> to workflow variable

// Type for LLM parameters
export interface LLMParameters {
    prompt_template_id: string;
    regular_variables: Record<string, any>;
    file_variables: Record<string, string>;
}

// Type for resolved parameter values
export type ResolvedParameters = LLMParameters | Record<string, any>;

// Type for tool outputs - using SchemaValueType from schema.ts
export type ToolOutputs = Record<ToolOutputName, SchemaValueType>;

export interface Tool {
    tool_id: string;
    name: string;
    description: string;
    tool_type: string;
    signature: ToolSignature;
} 