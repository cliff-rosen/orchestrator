import { useState, useCallback } from 'react';
import { SchemaDictionary } from './SchemaDictionary';
import { SchemaRole, SchemaState, SchemaValue } from './types';

export function useSchemaDictionary(initialState: SchemaState = {}) {
    const [manager] = useState(() => new SchemaDictionary(initialState));
    const [version, setVersion] = useState(0);

    const setSchema = useCallback((key: string, schema: SchemaValue, role: SchemaRole) => {
        manager.setSchema(key, schema, role);
        //setVersion(v => v + 1);
    }, [manager]);

    const setValues = useCallback((key: string, value: any) => {
        manager.setValues(key, value);
        //setVersion(v => v + 1);
    }, [manager]);

    const getValue = useCallback((key: string) => {
        return manager.getValue(key);
    }, [manager]);

    const removeSchema = useCallback((key: string) => {
        manager.removeSchema(key);
        //setVersion(v => v + 1);
    }, [manager]);

    return {
        schemas: manager.getSchemas(),
        values: manager.getValues(),
        setSchema,
        setValues,
        getValue,
        removeSchema
    };
} 