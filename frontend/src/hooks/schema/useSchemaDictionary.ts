import { useState, useCallback, useMemo } from 'react';
import { SchemaDictionary } from './SchemaDictionary';
import { SchemaRole, SchemaState, SchemaValue, SchemaManager } from './types';

export function useSchemaDictionary(initialState: SchemaState = {}): SchemaManager {
    const [schemaDictionary] = useState(() => new SchemaDictionary(initialState));
    const [version, setVersion] = useState(0);

    const setSchema = useCallback((key: string, schema: SchemaValue, role: SchemaRole) => {
        console.log('setSchema', key, schema, role);
        schemaDictionary.setSchema(key, schema, role);
        setVersion(v => v + 1);
    }, []);

    const setValues = useCallback((key: string, value: any) => {
        schemaDictionary.setValues(key, value);
        setVersion(v => v + 1);
    }, []);

    const getValue = useCallback((key: string) => {
        return schemaDictionary.getValue(key);
    }, []);

    const removeSchema = useCallback((key: string) => {
        schemaDictionary.removeSchema(key);
        setVersion(v => v + 1);
    }, []);

    return {
        schemas: schemaDictionary.getSchemas(),
        values: schemaDictionary.getValues(),
        version,
        setSchema,
        setValues,
        getValue,
        removeSchema
    };
} 