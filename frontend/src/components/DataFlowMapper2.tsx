import React, { useState, useEffect } from 'react';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { Schema, ValueType } from '../types/schema';
import { WorkflowVariable, WorkflowVariableName, createWorkflowVariable } from '../types/workflows';
import { parseVariablePath } from '../lib/utils/variablePathUtils';
import { renderVariablePaths, formatVariablePath, getTypeColor, isCompatibleType } from '../lib/utils/variableUIUtils';

interface DataFlowMapper2Props {
    // Original DataFlowMapper props
    tool: Tool;
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    output_mappings: Record<ToolOutputName, WorkflowVariableName>;
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    onParameterMappingChange: (mappings: Record<ToolParameterName, WorkflowVariableName>) => void;
    onOutputMappingChange: (mappings: Record<ToolOutputName, WorkflowVariableName>) => void;
    // New prop for variable creation
    onVariableCreate?: (variable: WorkflowVariable) => void;
}

const DataFlowMapper2: React.FC<DataFlowMapper2Props> = ({
    tool,
    parameter_mappings,
    output_mappings,
    inputs,
    outputs,
    onParameterMappingChange,
    onOutputMappingChange,
    onVariableCreate
}) => {
    // Track which parameter/output is being configured
    const [activeParameter, setActiveParameter] = useState<string | null>(null);
    const [activeOutput, setActiveOutput] = useState<string | null>(null);

    // Track variable creation modal
    const [showVariableCreation, setShowVariableCreation] = useState(false);
    const [creatingForParameter, setCreatingForParameter] = useState<string | null>(null);
    const [creatingForOutput, setCreatingForOutput] = useState<string | null>(null);

    // Track variable creation form state
    const [newVarName, setNewVarName] = useState('');
    const [newVarDescription, setNewVarDescription] = useState('');
    const [newVarSchema, setNewVarSchema] = useState<Schema | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);

    // Add useEffect to log tool signature structure
    useEffect(() => {

        if (tool.signature.outputs && tool.signature.outputs.length > 0) {
            const firstOutput = tool.signature.outputs[0];
            console.log('First output:', firstOutput);
            console.log('First output schema:', firstOutput.schema);
            console.log('First output schema type:', firstOutput.schema?.type);
            console.log('First output schema is_array:', firstOutput.schema?.is_array);
        }

        if (tool.signature.parameters && tool.signature.parameters.length > 0) {
            const firstParam = tool.signature.parameters[0];
            console.log('First parameter:', firstParam);
            console.log('First parameter schema:', firstParam.schema);
            console.log('First parameter schema type:', firstParam.schema?.type);
            console.log('First parameter schema is_array:', firstParam.schema?.is_array);
        }
    }, [tool]);

    const handleCreateParameterVariable = (paramName: string) => {
        const param = tool.signature.parameters.find(p => p.name === paramName);
        setCreatingForParameter(paramName);

        // The schema structure is nested, so we need to extract it properly
        if (!param || !param.schema) {
            // Fallback to a default schema if param or schema is missing
            setNewVarSchema({
                type: 'string' as ValueType,
                is_array: false,
                description: '',
                fields: {}
            });
        } else {
            // Create a properly structured Schema object from the parameter schema
            // Ensure we're correctly handling the schema structure
            const schema = param.schema;
            const safeSchema: Schema = {
                type: (schema.type as ValueType) || 'string',
                is_array: Boolean(schema.is_array),
                description: schema.description || '',
                fields: schema.fields ? { ...schema.fields } : {},
                format: schema.format,
                content_types: schema.content_types
            };
            setNewVarSchema(safeSchema);
        }

        setNewVarName(paramName);
        setShowVariableCreation(true);
    };

    const handleOutputMappingChange = (outputName: string, value: string) => {
        const newMappings = {
            ...output_mappings,
            [outputName as ToolOutputName]: value as WorkflowVariableName
        };
        onOutputMappingChange(newMappings);
    };

    const handleParameterMappingChange = (paramName: string, value: string) => {
        const newMappings = {
            ...parameter_mappings,
            [paramName as ToolParameterName]: value as WorkflowVariableName
        };
        onParameterMappingChange(newMappings);
    };

    const handleCreateOutputVariable = (outputName: string) => {
        const output = tool.signature.outputs.find(o => o.name === outputName);
        setCreatingForOutput(outputName);

        // The schema structure is nested, so we need to extract it properly
        if (!output || !output.schema || output.schema.type != 'object') {
            // Fallback to a default schema if output or schema is missing
            setNewVarSchema({
                type: 'string' as ValueType,
                is_array: false,
                description: '',
                fields: {}
            });
        } else {
            const fields = output.schema.fields?.fields || {};
            console.log('fields', fields);

            var newFields: Record<string, Schema> = {};

            // iterate over the fields and create a new schema for each field       
            Object.entries(fields).forEach(([fieldName, fieldSchema]) => {
                newFields[fieldName] = fieldSchema as Schema;
            });

            const newSchema = {
                type: 'object' as ValueType,
                is_array: output.schema.is_array,
                description: output.schema.description,
                fields: newFields
            };

            console.log('newSchema', newSchema);
            setNewVarSchema(newSchema);
        }

        setNewVarName(outputName);
        setShowVariableCreation(true);
    };

    const handleCreateVariableSubmit = () => {
        const paramOrOutput = creatingForParameter
            ? tool.signature.parameters.find(p => p.name === creatingForParameter)
            : creatingForOutput
                ? tool.signature.outputs.find(o => o.name === creatingForOutput)
                : null;

        console.log('Creating variable from:', paramOrOutput);
        console.log('Using schema:', newVarSchema);

        if (!newVarName || !newVarSchema) {
            setNameError('Variable name and schema are required');
            return;
        }

        // Ensure the schema is properly structured before creating the variable
        const validatedSchema: Schema = {
            type: newVarSchema.type || 'string',
            is_array: Boolean(newVarSchema.is_array),
            description: newVarSchema.description || '',
            fields: newVarSchema.fields ? { ...newVarSchema.fields } : {},
            format: newVarSchema.format,
            content_types: newVarSchema.content_types
        };

        // Create the new variable
        const newVar = createWorkflowVariable(
            `new_${Date.now()}`, // Temporary ID, backend will assign real one
            newVarName,
            validatedSchema,
            creatingForParameter ? 'input' : 'output'
        );

        console.log('Created new variable:', newVar);

        // Call the callback
        if (onVariableCreate) {
            onVariableCreate(newVar);
        }

        // Update the mapping
        if (creatingForParameter) {
            handleParameterMappingChange(creatingForParameter, newVarName);
        } else if (creatingForOutput) {
            handleOutputMappingChange(creatingForOutput, newVarName);
        }

        // Reset state
        setShowVariableCreation(false);
        setNewVarName('');
        setNewVarSchema(null);
        setCreatingForParameter(null);
        setCreatingForOutput(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && newVarName.trim() && newVarSchema) {
            e.preventDefault();
            handleCreateVariableSubmit();
        }
    };

    const renderSchemaEditor = () => {
        if (!newVarSchema) return null;

        // If we're creating for a specific parameter/output, show schema info instead of editor
        if (creatingForParameter || creatingForOutput) {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Schema (inherited from {creatingForParameter ? 'parameter' : 'output'})
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                            <span className={`text-sm ${getTypeColor(newVarSchema.type || 'string', Boolean(newVarSchema.is_array))}`}>
                                {newVarSchema.type || 'string'}{newVarSchema.is_array ? '[]' : ''}
                            </span>
                        </div>
                        {newVarSchema.type === 'object' && newVarSchema.fields && (
                            <div className="mt-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fields:</div>
                                <div className="space-y-2 pl-4">
                                    {Object.entries(newVarSchema.fields || {}).map(([fieldName, fieldSchema]) => {
                                        // Add null check for fieldSchema
                                        if (!fieldSchema) return null;

                                        // Ensure we have a type
                                        const fieldType = fieldSchema.type || 'string';
                                        const isArray = Boolean(fieldSchema.is_array);

                                        return (
                                            <div key={fieldName} className="flex items-center justify-between border-l-2 border-gray-200 dark:border-gray-700 pl-2 py-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <span className="font-bold">{fieldName}</span>
                                                    {fieldSchema.description && (
                                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                            ({fieldSchema.description})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={`text-sm ${getTypeColor(fieldType, isArray)}`}>
                                                    {fieldType}{isArray ? '[]' : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Helper functions for schema editing
        const addObjectField = () => {
            const fields = newVarSchema.fields || {};
            setNewVarSchema({
                ...newVarSchema,
                fields: {
                    ...fields,
                    [`field_${Object.keys(fields).length + 1}`]: {
                        type: 'string' as ValueType,
                        description: '',
                        is_array: false,
                        fields: {}
                    }
                }
            });
        };

        const updateObjectField = (fieldName: string, updates: Partial<Schema>) => {
            if (!newVarSchema.fields) return;

            // Ensure the field exists
            const currentField = newVarSchema.fields[fieldName] || {
                type: 'string' as ValueType,
                description: '',
                is_array: false,
                fields: {}
            };

            // Create a properly structured updated field
            const updatedField: Schema = {
                ...currentField,
                ...updates,
                // Ensure fields is properly initialized if type is changing to object
                fields: updates.type === 'object' ?
                    (updates.fields || currentField.fields || {}) :
                    (currentField.type === 'object' ? currentField.fields : {})
            };

            setNewVarSchema({
                ...newVarSchema,
                fields: {
                    ...newVarSchema.fields,
                    [fieldName]: updatedField
                }
            });
        };

        const removeObjectField = (fieldName: string) => {
            if (!newVarSchema.fields) return;

            const { [fieldName]: removed, ...remainingFields } = newVarSchema.fields;
            setNewVarSchema({
                ...newVarSchema,
                fields: remainingFields
            });
        };

        // Original schema editor for when we're not creating for a specific parameter/output
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schema
                </label>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                        <select
                            value={newVarSchema.type}
                            onChange={(e) => setNewVarSchema({
                                ...newVarSchema,
                                type: e.target.value as any,
                                fields: e.target.value === 'object' ? {} : undefined
                            })}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="object">Object</option>
                            <option value="array">Array</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isArray"
                            checked={newVarSchema.is_array || false}
                            onChange={(e) => setNewVarSchema({
                                ...newVarSchema,
                                is_array: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isArray" className="text-sm text-gray-600 dark:text-gray-400">
                            Is Array
                        </label>
                    </div>

                    {newVarSchema.type === 'object' && (
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm text-gray-600 dark:text-gray-400">
                                    Object Fields
                                </label>
                                <button
                                    onClick={addObjectField}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                                >
                                    + Add Field
                                </button>
                            </div>
                            <div className="space-y-3">
                                {Object.entries(newVarSchema.fields || {}).map(([fieldName, fieldSchema]) => (
                                    <div key={fieldName} className="flex items-start space-x-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={fieldName}
                                                onChange={(e) => {
                                                    const newFields = { ...newVarSchema.fields };
                                                    delete newFields[fieldName];
                                                    setNewVarSchema({
                                                        ...newVarSchema,
                                                        fields: {
                                                            ...newFields,
                                                            [e.target.value]: fieldSchema
                                                        }
                                                    });
                                                }}
                                                placeholder="Field name"
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                            <select
                                                value={fieldSchema.type}
                                                onChange={(e) => updateObjectField(fieldName, { type: e.target.value as any })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            >
                                                <option value="string">String</option>
                                                <option value="number">Number</option>
                                                <option value="boolean">Boolean</option>
                                                <option value="object">Object</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={fieldSchema.description || ''}
                                                onChange={(e) => updateObjectField(fieldName, { description: e.target.value })}
                                                placeholder="Field description"
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeObjectField(fieldName)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderParameterMapping = (param: any) => {
        const isActive = activeParameter === param.name;
        const currentMapping = parameter_mappings[param.name as ToolParameterName];

        return (
            <div
                key={param.name}
                className={`p-4 rounded-lg border ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {param.name}
                    </span>
                    <span className={`text-xs ${getTypeColor(param.schema.type, param.schema.is_array)}`}>
                        {param.schema.type}{param.schema.is_array ? '[]' : ''}
                    </span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setActiveParameter(isActive ? null : param.name)}
                        className="w-full px-3 py-2 text-left text-sm border rounded-md bg-white dark:bg-gray-800
                                 text-gray-900 dark:text-gray-100
                                 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {formatVariablePath(currentMapping) || 'Select or create variable'}
                    </button>

                    {isActive && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => handleCreateParameterVariable(param.name)}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400
                                             hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                    + Create new variable
                                </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {inputs.concat(outputs)
                                    .filter(v => isCompatibleType(param.schema, v.schema))
                                    .flatMap(variable => renderVariablePaths(
                                        variable,
                                        (path) => {
                                            handleParameterMappingChange(param.name, path as WorkflowVariableName);
                                            setActiveParameter(null);
                                        }
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {currentMapping && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {inputs.concat(outputs).find(v => v.name === parseVariablePath(currentMapping).rootName)?.schema.description}
                    </div>
                )}
            </div>
        );
    };

    const renderOutputMapping = (output: any) => {
        const isActive = activeOutput === output.name;
        const currentMapping = output_mappings[output.name as ToolOutputName];

        return (
            <div
                key={output.name}
                className={`p-4 rounded-lg border ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {output.name}
                    </span>
                    <span className={`text-xs ${getTypeColor(output.schema.type, output.schema.is_array)}`}>
                        {output.schema.type}{output.schema.is_array ? '[]' : ''}
                    </span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setActiveOutput(isActive ? null : output.name)}
                        className="w-full px-3 py-2 text-left text-sm border rounded-md bg-white dark:bg-gray-800
                                 text-gray-900 dark:text-gray-100
                                 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {formatVariablePath(currentMapping) || 'Map to variable'}
                    </button>

                    {isActive && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => handleCreateOutputVariable(output.name as ToolOutputName)}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400
                                             hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                    + Create new variable
                                </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {outputs.concat(inputs)
                                    .filter(v => isCompatibleType(output.schema, v.schema))
                                    .flatMap(variable => renderVariablePaths(
                                        variable,
                                        (path) => {
                                            handleOutputMappingChange(output.name, path as WorkflowVariableName);
                                            setActiveOutput(null);
                                        }
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {currentMapping && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {outputs.concat(inputs).find(v => v.name === parseVariablePath(currentMapping).rootName)?.schema.description}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Main Content Area with Parameters and Outputs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Parameters Section */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 py-2 sticky top-0 z-10">
                        Tool Parameters
                    </h4>
                    <div className="space-y-4">
                        {tool.signature.parameters.map(param => renderParameterMapping(param))}
                    </div>
                </div>

                {/* Outputs Section */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 py-2 sticky top-0 z-10">
                        Tool Outputs
                    </h4>
                    <div className="space-y-4">
                        {tool.signature.outputs.map(output => renderOutputMapping(output))}
                    </div>
                </div>
            </div>

            {/* Variable Creation Modal - Now positioned relative to viewport with highest z-index */}
            {showVariableCreation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div
                        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[32rem] max-h-[90vh] flex flex-col"
                        style={{ zIndex: 9999 }}
                    >
                        <div className="p-6 flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                                Create New Variable
                            </h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Variable Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newVarName}
                                        onChange={(e) => {
                                            setNewVarName(e.target.value);
                                            setNameError(null); // Clear error when user types
                                        }}
                                        className={`w-full px-3 py-2 text-sm border ${nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                                        placeholder="Enter variable name"
                                        autoFocus
                                    />
                                    {nameError && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {nameError}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={newVarDescription}
                                        onChange={(e) => setNewVarDescription(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        rows={2}
                                        placeholder="Describe the purpose of this variable"
                                    />
                                </div>

                                {renderSchemaEditor()}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setShowVariableCreation(false);
                                    setCreatingForParameter(null);
                                    setCreatingForOutput(null);
                                    setNewVarSchema(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateVariableSubmit}
                                disabled={!newVarName.trim() || !newVarSchema}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                                         hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                Create Variable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataFlowMapper2; 