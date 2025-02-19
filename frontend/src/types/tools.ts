import { Schema, SchemaValueType, VariableName } from './schema';

export type ToolType = 'llm' | 'search' | 'retrieve' | 'utility';

export interface ToolParameter {
    schema: Schema;
    required?: boolean;
    default?: SchemaValueType;
}

export interface ToolOutput {
    schema: Schema;
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
export type ParameterMappingType = Record<VariableName, VariableName>;
export type OutputMappingType = Record<VariableName, VariableName>;

// Type for LLM parameters
export interface LLMParameters {
    prompt_template_id: string;
    regular_variables: Record<VariableName, SchemaValueType>;
    file_variables: Record<VariableName, string>;
}

// Type for resolved parameter values
export type ResolvedParameters = LLMParameters | Record<string, any>;

// Type for tool outputs - using SchemaValueType from schema.ts
export type ToolOutputs = Record<ToolOutputName, SchemaValueType>;

export interface Tool {
    tool_id: string;
    name: string;
    description: string;
    tool_type: 'llm' | 'search' | 'retrieve' | 'utility';
    signature: ToolSignature;
} 