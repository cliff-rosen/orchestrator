import { useState, useCallback } from 'react';
import { SchemaDictionary } from './SchemaDictionary';
import { SchemaState, FieldDefinition, SchemaEntry } from './types';

export function useSchemaDictionary(initialState: SchemaState = {}) {
    const [manager] = useState(() => new SchemaDictionary(initialState));
    const [state, setState] = useState<SchemaState>(initialState);

    const setSchema = useCallback((key: string, schema: FieldDefinition[]) => {
        manager.setSchema(key, schema);
        setState(manager.getState());
    }, [manager]);

    const setValues = useCallback((key: string, values: Record<string, any>) => {
        manager.setValues(key, values);
        setState(manager.getState());
    }, [manager]);

    const removeSchema = useCallback((key: string) => {
        manager.removeSchema(key);
        setState(manager.getState());
    }, [manager]);

    return {
        state,       // The full state dictionary
        setSchema,   // Set schema for a key
        setValues,   // Set values for a key
        removeSchema // Remove entry for a key
    };
} 