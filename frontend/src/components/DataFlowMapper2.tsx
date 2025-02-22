import React, { useState } from 'react';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { WorkflowVariable, WorkflowVariableName } from '../types/workflows';
import { Schema } from '../types/schema';

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

    // Compatibility check from original DataFlowMapper
    const isCompatibleType = (paramSchema: Schema, varSchema: Schema): boolean => {
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
        if (paramSchema.type === 'object' && paramSchema.fields && varSchema.fields) {
            return Object.entries(paramSchema.fields).every(([fieldName, fieldSchema]) => {
                const varFields = varSchema.fields || {};
                const varField = varFields[fieldName];
                return varField && isCompatibleType(fieldSchema, varField);
            });
        }
        return true;
    };

    // Get color for data type (maintained for consistency)
    const getTypeColor = (type: string, isArray: boolean = false): string => {
        if (isArray) return 'text-orange-600 dark:text-orange-400';
        switch (type) {
            case 'string': return 'text-blue-600 dark:text-blue-400';
            case 'number': return 'text-green-600 dark:text-green-400';
            case 'boolean': return 'text-purple-600 dark:text-purple-400';
            case 'object': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const handleParameterMappingChange = (paramName: string, value: string) => {
        const newMappings = {
            ...parameter_mappings,
            [paramName as ToolParameterName]: value as WorkflowVariableName
        };
        onParameterMappingChange(newMappings);
    };

    const handleCreateVariable = (paramName: string) => {
        const param = tool.signature.parameters.find(p => p.name === paramName);
        setCreatingForParameter(paramName);
        setNewVarSchema(param?.schema || null);
        setShowVariableCreation(true);
    };

    const handleOutputMappingChange = (outputName: string, value: string) => {
        const newMappings = {
            ...output_mappings,
            [outputName as ToolOutputName]: value as WorkflowVariableName
        };
        onOutputMappingChange(newMappings);
    };

    const handleCreateOutputVariable = (outputName: string) => {
        const output = tool.signature.outputs.find(o => o.name === outputName);
        setCreatingForOutput(outputName);
        setNewVarSchema(output?.schema || null);
        setShowVariableCreation(true);
    };

    const handleCreateVariableSubmit = () => {
        const paramOrOutput = creatingForParameter
            ? tool.signature.parameters.find(p => p.name === creatingForParameter)
            : tool.signature.outputs.find(o => o.name === creatingForOutput);

        if (!paramOrOutput || !newVarSchema) return;

        const newVariable: WorkflowVariable = {
            variable_id: `new_${Date.now()}`, // Temporary ID, backend will assign real one
            name: newVarName as WorkflowVariableName,
            description: newVarDescription,
            schema: newVarSchema,
            io_type: creatingForOutput ? 'output' : 'input'
        };

        // Notify parent about new variable
        onVariableCreate?.(newVariable);

        // // Add to appropriate list and update mapping
        // if (creatingForParameter) {
        //     handleParameterMappingChange(creatingForParameter, newVariable.name);
        // } else if (creatingForOutput) {
        //     handleOutputMappingChange(creatingForOutput, newVariable.name);
        // }

        // Reset form and close modal
        setNewVarName('');
        setNewVarDescription('');
        setNewVarSchema(null);
        setShowVariableCreation(false);
        setCreatingForParameter(null);
        setCreatingForOutput(null);

        // Force a re-render after a short delay to ensure the new variable is available
        setTimeout(() => {
            setActiveParameter(null);
            setActiveOutput(null);
        }, 100);
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
                            <span className={`text-sm ${getTypeColor(newVarSchema.type, newVarSchema.is_array)}`}>
                                {newVarSchema.type}{newVarSchema.is_array ? '[]' : ''}
                            </span>
                        </div>
                        {newVarSchema.type === 'object' && newVarSchema.fields && (
                            <div className="mt-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fields:</div>
                                <div className="space-y-2 pl-4">
                                    {Object.entries(newVarSchema.fields).map(([fieldName, fieldSchema]) => (
                                        <div key={fieldName} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{fieldName}</span>
                                            <span className={`text-sm ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                                                {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                                            </span>
                                        </div>
                                    ))}
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
                        type: 'string',
                        description: '',
                        is_array: false
                    }
                }
            });
        };

        const updateObjectField = (fieldName: string, updates: Partial<Schema>) => {
            if (!newVarSchema.fields) return;

            setNewVarSchema({
                ...newVarSchema,
                fields: {
                    ...newVarSchema.fields,
                    [fieldName]: {
                        ...newVarSchema.fields[fieldName],
                        ...updates
                    }
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
                        {currentMapping || 'Select or create variable'}
                    </button>

                    {isActive && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => handleCreateVariable(param.name)}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400
                                             hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                    + Create new variable
                                </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {inputs.concat(outputs)
                                    .filter(v => isCompatibleType(param.schema, v.schema))
                                    .map(variable => (
                                        <button
                                            key={variable.variable_id}
                                            onClick={() => {
                                                handleParameterMappingChange(param.name, variable.name);
                                                setActiveParameter(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                                                     hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                                        >
                                            <span>{variable.name}</span>
                                            <span className={`text-xs ${getTypeColor(variable.schema.type, variable.schema.is_array)}`}>
                                                {variable.schema.type}{variable.schema.is_array ? '[]' : ''}
                                            </span>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>

                {currentMapping && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {inputs.concat(outputs).find(v => v.name === currentMapping)?.schema.description}
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
                        {currentMapping || 'Map to variable'}
                    </button>

                    {isActive && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => handleCreateOutputVariable(output.name)}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400
                                             hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                    + Create new variable
                                </button>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {outputs.concat(inputs)
                                    .filter(v => isCompatibleType(output.schema, v.schema))
                                    .map(variable => (
                                        <button
                                            key={variable.variable_id}
                                            onClick={() => {
                                                handleOutputMappingChange(output.name, variable.name);
                                                setActiveOutput(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                                                     hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                                        >
                                            <span>{variable.name}</span>
                                            <span className={`text-xs ${getTypeColor(variable.schema.type, variable.schema.is_array)}`}>
                                                {variable.schema.type}{variable.schema.is_array ? '[]' : ''}
                                            </span>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>

                {currentMapping && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {outputs.concat(inputs).find(v => v.name === currentMapping)?.schema.description}
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
                                        onChange={(e) => setNewVarName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        placeholder="Enter variable name"
                                        autoFocus
                                    />
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