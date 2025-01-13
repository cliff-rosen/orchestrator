import { FieldDefinition, SchemaState, SchemaEntry } from './types';

export class SchemaDictionary {
    private state: SchemaState;

    constructor(initialState: SchemaState = {}) {
        this.state = initialState;
    }

    getState(): SchemaState {
        return this.state;
    }

    setSchema(name: string, schema: FieldDefinition[]) {
        if (this.state[name]) {
            this.state[name] = {
                schema,
                values: this.validateValues(schema, this.state[name].values)
            };
        } else {
            this.state[name] = {
                schema,
                values: this.getDefaultValues(schema)
            };
        }
    }

    setValues(name: string, values: Record<string, any>) {
        if (!this.state[name]) {
            throw new Error(`Schema '${name}' not found`);
        }

        this.state[name] = {
            ...this.state[name],
            values: this.validateValues(this.state[name].schema, values)
        };
    }

    removeSchema(name: string) {
        delete this.state[name];
    }

    getEntry(name: string): SchemaEntry | undefined {
        return this.state[name];
    }

    private getDefaultValues(schema: FieldDefinition[]): Record<string, any> {
        const defaults: Record<string, any> = {};

        for (const field of schema) {
            defaults[field.name] = this.getDefaultValueForField(field);
        }

        return defaults;
    }

    private getDefaultValueForField(field: FieldDefinition): any {
        switch (field.type) {
            case 'string':
                return '';
            case 'number':
                return 0;
            case 'boolean':
                return false;
            case 'array':
                return [];
            case 'object':
                return this.getDefaultValues(field.fields);
            default:
                return null;
        }
    }

    private validateValues(schema: FieldDefinition[], values: Record<string, any>): Record<string, any> {
        const validated: Record<string, any> = {};

        for (const field of schema) {
            const value = values[field.name];
            validated[field.name] = this.validateFieldValue(field, value);
        }

        return validated;
    }

    private validateFieldValue(field: FieldDefinition, value: any): any {
        switch (field.type) {
            case 'string':
                return String(value || '');

            case 'number':
                const num = Number(value);
                return isNaN(num) ? 0 : num;

            case 'boolean':
                return Boolean(value);

            case 'array':
                if (!Array.isArray(value)) return [];
                return value.map(item => this.validateFieldValue(field.itemType, item));

            case 'object':
                if (typeof value !== 'object' || value === null) {
                    return this.getDefaultValueForField(field);
                }
                return this.validateValues(field.fields, value);

            default:
                return null;
        }
    }
} 