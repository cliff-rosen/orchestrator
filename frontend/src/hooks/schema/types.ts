export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'array' | 'object';
export type FieldType = PrimitiveType | ComplexType;

export interface BaseFieldDefinition {
    name: string;
    type: FieldType;
    label?: string;
    required?: boolean;
}

export interface PrimitiveFieldDefinition extends BaseFieldDefinition {
    type: PrimitiveType;
}

export interface ArrayFieldDefinition extends BaseFieldDefinition {
    type: 'array';
    itemType: FieldDefinition;
}

export interface ObjectFieldDefinition extends BaseFieldDefinition {
    type: 'object';
    fields: FieldDefinition[];
}

export type FieldDefinition =
    | PrimitiveFieldDefinition
    | ArrayFieldDefinition
    | ObjectFieldDefinition;

export interface SchemaEntry {
    schema: FieldDefinition[];
    values: Record<string, any>;
}

export type SchemaState = Record<string, SchemaEntry>;

export interface SchemaManager {
    state: SchemaState;
    setSchema: (key: string, schema: FieldDefinition[]) => void;
    setValues: (key: string, values: Record<string, any>) => void;
    removeSchema: (key: string) => void;
} 