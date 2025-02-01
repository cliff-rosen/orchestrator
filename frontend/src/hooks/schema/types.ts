export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'array' | 'object';
export type ValueType = PrimitiveType | ComplexType;

// Base value type that all schema entries extend
export interface BaseValue {
    name: string;
    type: ValueType;
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

// Union type for all possible schema values
export type SchemaValue = PrimitiveValue | ArrayValue | ObjectValue;

export type SchemaRole = 'input' | 'output';

export interface SchemaEntry {
    role: SchemaRole;
    schema: SchemaValue;
}

export type SchemaState = Record<string, SchemaEntry>;

// Schema manager interface
export interface SchemaManager {
    schemas: SchemaState;
    values: Record<string, any>;
    version: number;
    setSchema: (key: string, schema: SchemaValue, role: SchemaRole) => void;
    setValues: (key: string, value: any) => void;
    getValue: (key: string) => any;
    removeSchema: (key: string) => void;
}

// Schema hierarchy
// SchemaValue -> {name: string, type: string, required: boolean, items: SchemaValue, fields: Record<string, SchemaValue>}
// SchemaEntry -> {role: 'input' | 'output', schema: SchemaValue}
// SchemaState -> Record<string, SchemaEntry>
// SchemaManager -> {
//      schemas: SchemaState,
//      values: Record<string, any>,
//      version: number,
//      setSchema: (key: string, schema: SchemaValue, role: SchemaRole) => void,
//      setValues: (key: string, value: any) => void,
//      getValue: (key: string) => any,
//      removeSchema: (key: string) => void
// } 

