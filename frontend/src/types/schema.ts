// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'array' | 'object' | 'file';
export type ValueType = PrimitiveType | ComplexType;

// Base value type that all schema entries extend
export interface BaseValue {
    name: string;
    type: ValueType;
    description?: string;
    required?: boolean;
}

// Primitive values (string, number, boolean)
export interface PrimitiveValue extends BaseValue {
    type: PrimitiveType;
}

// Array values
export interface ArrayValue extends BaseValue {
    type: 'array';
    items: SchemaValue;  // The type of items in the array
}

// Object values with nested fields
export interface ObjectValue extends BaseValue {
    type: 'object';
    fields: Record<string, SchemaValue>;  // Named fields mapping to their types
}

// File values
export interface FileValue extends BaseValue {
    type: 'file';
    file_id?: string;  // Optional because it may not be set until runtime
}

// Union type for all possible schema values
export type SchemaValue = PrimitiveValue | ArrayValue | ObjectValue | FileValue;

export type SchemaValueType = string | number | boolean | any[] | Record<string, any> | { file_id: string };