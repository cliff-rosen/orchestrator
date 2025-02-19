import { Schema, SchemaValueType, VariableName } from './schema';

export type ToolType = 'llm' | 'search' | 'retrieve' | 'utility';

// Tool parameter definition
export interface ToolParameter {
    name: string;           // Parameter name in the tool's context
    schema: Schema;         // Structure definition
    required?: boolean;     // Whether this parameter must be provided
    default?: SchemaValueType;  // Default value if not provided
    description?: string;   // Describes this parameter to tool users
}

// Tool output definition
export interface ToolOutput {
    name: string;           // Output name in the tool's context
    schema: Schema;         // Structure definition
    description?: string;   // Describes this output to tool users
}

// Complete tool signature
export interface ToolSignature {
    parameters: ToolParameter[];
    outputs: ToolOutput[];
}

// Tool and workflow variable names as branded types for type safety
export type ToolParameterName = string & { readonly __brand: unique symbol };
export type ToolOutputName = string & { readonly __brand: unique symbol };
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Mapping types with semantic meaning
export type ParameterMappingType = Record<VariableName, VariableName>;
export type OutputMappingType = Record<VariableName, VariableName>;

// Type for resolved parameter values at runtime
export type ResolvedParameters = Record<ToolParameterName, SchemaValueType>;

// Type for tool outputs at runtime
export type ToolOutputs = Record<ToolOutputName, SchemaValueType>;

// LLM-specific parameter types
export interface LLMParameters extends ResolvedParameters {
    prompt_template_id: string;
    regular_variables: Record<VariableName, SchemaValueType>;
    file_variables: Record<VariableName, string>;
}

export interface Tool {
    tool_id: string;
    name: string;
    description: string;
    tool_type: ToolType;
    signature: ToolSignature;
} 