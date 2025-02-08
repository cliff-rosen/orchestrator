// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'array' | 'object';
export type ValueType = 'string' | 'number' | 'boolean' | 'array' | 'object';

// Base value type that all schema entries extend
export interface BaseValue {
    name: string;
    type: ValueType;
    required?: boolean;
}

// Primitive values (string, number, boolean)
export interface PrimitiveValue extends BaseValue {
    type: ValueType;
    description?: string;
    is_array?: boolean;
}

// Array values
export interface ArrayValue extends PrimitiveValue {
    type: 'array';
    items: SchemaValue;  // The type of items in the array
}

// Object values with nested fields
export interface ObjectValue extends PrimitiveValue {
    type: 'object';
    fields: Record<string, SchemaValue>;  // Named fields mapping to their types
}

// Union type for all possible schema values
export type SchemaValue = PrimitiveValue | ArrayValue | ObjectValue;