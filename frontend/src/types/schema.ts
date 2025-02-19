// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'object' | 'file';
export type ValueType = PrimitiveType | ComplexType;

// Core schema definition that describes the shape/structure of a value
export interface Schema {
    name: string;
    type: ValueType;
    description?: string;
    array_type: boolean;
    // Only used for object type
    fields?: Record<string, Schema>;
    // Format constraints
    format?: string;
    content_types?: string[];
}

// Runtime value for files
export interface FileValue {
    file_id: string;
    name: string;
    description?: string;
    content: Uint8Array;
    mime_type: string;
    size: number;
    extracted_text?: string;
    created_at: string;
    updated_at: string;
}

// Runtime value type for any schema
export type SchemaValueType =
    | string
    | number
    | boolean
    | Record<string, any>
    | FileValue
    | SchemaValueType[]; // For array types

// Variable with value that can be used in workflows/jobs
export interface Variable {
    variable_id: string;
    schema: Schema;  // The type definition
    value?: SchemaValueType;  // The actual value
    description?: string;
}

// Branded types for type-safe variable references
export type VariableName = string & { readonly __brand: unique symbol };

// Type-safe mapping types
export type VariableMappingType = Record<VariableName, VariableName>;