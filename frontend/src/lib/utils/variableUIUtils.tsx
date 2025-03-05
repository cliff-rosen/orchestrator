import React from 'react';
import { WorkflowVariable, WorkflowVariableName } from '../../types/workflows';
import { Schema } from '../../types/schema';
import { parseVariablePath } from './variablePathUtils';

/**
 * Creates a schema for search results
 */
export const createSearchResultSchema = (): Schema => {
    return {
        type: 'object',
        is_array: true,
        description: 'Results from web search',
        fields: {
            title: {
                type: 'string',
                is_array: false,
                description: 'Title of the search result'
            },
            link: {
                type: 'string',
                is_array: false,
                description: 'URL of the search result'
            },
            snippet: {
                type: 'string',
                is_array: false,
                description: 'Text snippet from the search result'
            },
            displayLink: {
                type: 'string',
                is_array: false,
                description: 'Display URL of the search result'
            },
            relevance_score: {
                type: 'number',
                is_array: false,
                description: 'Relevance score of the search result'
            }
        }
    };
};

/**
 * Get color for data type (UI helper)
 */
export const getTypeColor = (type: string, isArray: boolean = false): string => {
    if (isArray) return 'text-orange-600 dark:text-orange-400';
    switch (type) {
        case 'string': return 'text-blue-600 dark:text-blue-400';
        case 'number': return 'text-green-600 dark:text-green-400';
        case 'boolean': return 'text-purple-600 dark:text-purple-400';
        case 'object': return 'text-red-600 dark:text-red-400';
        default: return 'text-gray-600 dark:text-gray-400';
    }
};

/**
 * Format a variable path for display
 */
export const formatVariablePath = (variablePath: string): string => {
    if (!variablePath) return 'Select or create variable';

    const { rootName, propPath } = parseVariablePath(variablePath);
    if (propPath.length === 0) {
        return rootName;
    }
    return `${rootName} → ${propPath.join(' → ')}`;
};

/**
 * Render variable paths with properties for selection
 * @param variable The workflow variable to render
 * @param onClick Callback when a path is clicked, receives the full path string
 * @param depth Current depth (for recursion)
 * @param currentPath Current path segments (for recursion)
 * @returns Array of JSX elements for rendering
 */
export const renderVariablePaths = (
    variable: WorkflowVariable,
    onClick: (path: string) => void,
    depth = 0,
    currentPath: string[] = []
): JSX.Element[] => {
    const { schema } = variable;

    if (schema.type !== 'object' || !schema.fields) {
        // For non-object types, just return the base variable
        return [
            <button
                key={variable.name + '_' + currentPath.join('.')}
                onClick={() => {
                    const fullPath = currentPath.length > 0
                        ? `${variable.name}.${currentPath.join('.')}`
                        : variable.name;
                    onClick(fullPath);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                        ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}`}
            >
                <span>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : variable.name}</span>
                <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                    {schema.type}{schema.is_array ? '[]' : ''}
                </span>
            </button>
        ];
    }

    // For objects, recursively render its properties
    const baseButton = currentPath.length === 0 ? [
        <button
            key={variable.name}
            onClick={() => {
                onClick(variable.name);
            }}
            className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                    hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                    ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}`}
        >
            <span>{variable.name} (whole object)</span>
            <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                {schema.type}{schema.is_array ? '[]' : ''}
            </span>
        </button>
    ] : [];

    // Create separate buttons for each field of the object
    const fieldButtons = Object.entries(schema.fields).flatMap(([fieldName, fieldSchema]) => {
        const newPath = [...currentPath, fieldName];
        const newDepth = depth + 1;

        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            // For object fields, add the field itself and its properties
            const fieldButton = (
                <button
                    key={variable.name + '_' + newPath.join('.')}
                    onClick={() => {
                        const fullPath = `${variable.name}.${newPath.join('.')}`;
                        onClick(fullPath);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                            hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                            pl-${newDepth * 4 + 3} border-l border-gray-200 dark:border-gray-700`}
                >
                    <span>{fieldName}</span>
                    <span className={`text-xs ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                        {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                    </span>
                </button>
            );

            // Recursively get field's properties
            return [fieldButton, ...renderVariablePaths(
                { ...variable, schema: fieldSchema } as WorkflowVariable,
                onClick,
                newDepth,
                newPath
            )];
        } else {
            // For scalar fields, just return the field button
            return [
                <button
                    key={variable.name + '_' + newPath.join('.')}
                    onClick={() => {
                        const fullPath = `${variable.name}.${newPath.join('.')}`;
                        onClick(fullPath);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                            hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                            pl-${newDepth * 4 + 3} border-l border-gray-200 dark:border-gray-700`}
                >
                    <span>{fieldName}</span>
                    <span className={`text-xs ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                        {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                    </span>
                </button>
            ];
        }
    });

    return [...baseButton, ...fieldButtons];
};

/**
 * Simple type compatibility check between schemas
 */
export const isCompatibleType = (paramSchema: Schema, varSchema: Schema): boolean => {
    if (paramSchema.type === 'string' && !paramSchema.is_array &&
        varSchema.type === 'string' && varSchema.is_array) {
        return true;
    }
    if (paramSchema.is_array !== varSchema.is_array) {
        return false;
    }
    if (paramSchema.type !== varSchema.type) {
        return false;
    }

    // Check object fields compatibility
    if (paramSchema.type === 'object' && paramSchema.fields && varSchema.fields) {
        return Object.entries(paramSchema.fields).every(([fieldName, fieldSchema]) => {
            const varFields = varSchema.fields || {};
            const varField = varFields[fieldName];
            return varField && isCompatibleType(fieldSchema, varField);
        });
    }
    return true;
}; 