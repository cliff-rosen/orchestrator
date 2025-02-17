// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'file';
export type ComplexType = 'object';
export type ValueType = PrimitiveType | ComplexType;

export interface SchemaValue {
    name: string;
    type: ValueType;
    description?: string;
    array_type: boolean;
    // Only used for object type
    fields?: Record<string, SchemaValue>;
    // File-specific fields
    format?: string;
    content_types?: string[];
    file_id?: string;
}

export type SchemaValueType = string | number | boolean | Record<string, any> | { file_id: string } | any[];