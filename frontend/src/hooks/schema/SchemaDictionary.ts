import { SchemaState, SchemaValue, SchemaRole } from './types';

export class SchemaDictionary {
    private schemas: SchemaState;
    private values: Record<string, any>;

    constructor(initialState: SchemaState = {}) {
        this.schemas = { ...initialState };
        this.values = {};
    }

    getSchemas(): SchemaState {
        return this.schemas;
    }

    getValues(): Record<string, any> {
        return this.values;
    }

    setSchema(key: string, schema: SchemaValue, role: SchemaRole): void {
        this.schemas = {
            ...this.schemas,
            [key]: { schema, role }
        };
    }

    setValues(key: string, value: any): void {
        if (!this.schemas[key]) {
            throw new Error(`No schema found for key: ${key}`);
        }
        this.values = {
            ...this.values,
            [key]: value
        };
    }

    getValue(key: string): any {
        return this.values[key];
    }

    removeSchema(key: string): void {
        const { [key]: _, ...remainingSchemas } = this.schemas;
        const { [key]: __, ...remainingValues } = this.values;
        this.schemas = remainingSchemas;
        this.values = remainingValues;
    }
} 