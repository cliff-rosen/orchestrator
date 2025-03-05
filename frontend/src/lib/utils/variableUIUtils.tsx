import { WorkflowVariable } from '../../types/workflows';
import { Schema } from '../../types/schema';
import { parseVariablePath } from './variablePathUtils';



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

    // Use a more visually distinct separator for nested paths
    return `${rootName}.${propPath.join('.')}`;
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

    // For non-object types or objects without fields, return the base variable button
    if (schema.type !== 'object' || !schema.fields) {
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

    // For objects, first add a button for the whole object (only at the root level)
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

    // Then add buttons for each field of the object
    const fieldButtons = Object.entries(schema.fields).flatMap(([fieldName, fieldSchema]) => {
        const newPath = [...currentPath, fieldName];
        const newDepth = depth + 1;

        // Create the button for this field
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

        // If this field is an object with fields, recursively get its properties
        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            // Create a temporary variable with this field's schema
            const tempVar: WorkflowVariable = {
                ...variable,
                schema: fieldSchema
            } as WorkflowVariable;

            // Return this field's button plus all its nested properties
            return [
                fieldButton,
                ...renderVariablePaths(tempVar, onClick, newDepth, newPath)
            ];
        }

        // For non-object fields, just return the field button
        return [fieldButton];
    });

    return [...baseButton, ...fieldButtons];
};

/**
 * Simple type compatibility check between schemas
 */
export const isCompatibleType = (paramSchema: Schema, varSchema: Schema): boolean => {

    // Direct type match
    if (paramSchema.type === varSchema.type && paramSchema.is_array === varSchema.is_array) {
        return true;
    }


    // Special case for string arrays to string conversion
    if (paramSchema.type === 'string' && !paramSchema.is_array &&
        varSchema.type === 'string' && varSchema.is_array) {
        return true;
    }

    // Object property compatibility - if param is a primitive type, it can match a property of an object
    if (!paramSchema.is_array && varSchema.type === 'object' && varSchema.fields) {
        // Check if any field in the object is compatible with the parameter
        return Object.values(varSchema.fields).some(fieldSchema =>
            isCompatibleType(paramSchema, fieldSchema)
        );
    }

    // Check object fields compatibility for object-to-object mapping
    if (paramSchema.type === 'object' && varSchema.type === 'object' &&
        paramSchema.fields && varSchema.fields) {
        return Object.entries(paramSchema.fields).every(([fieldName, fieldSchema]) => {
            const varFields = varSchema.fields || {};
            const varField = varFields[fieldName];
            return varField && isCompatibleType(fieldSchema, varField);
        });
    }

    return false;
}; 