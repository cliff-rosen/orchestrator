import React, { useState } from 'react';
import { SchemaValue, ValueType } from '../hooks/schema/types';
import { WorkflowVariable } from '../types';

interface WorkflowConfigProps {
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    onInputChange: (inputs: WorkflowVariable[]) => void;
    onOutputChange: (outputs: WorkflowVariable[]) => void;
}

const VALUE_TYPES: ValueType[] = ['string', 'number', 'boolean', 'array', 'object'];

interface SchemaFieldProps {
    value: SchemaValue;
    onChange: (value: SchemaValue) => void;
    onRemove: () => void;
    indent?: number;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ value, onChange, onRemove, indent = 0 }) => {
    return (
        <div className="space-y-2" style={{ marginLeft: `${indent * 20}px` }}>
            <div className="flex items-center gap-2">
                <input
                    value={value.name}
                    onChange={e => {
                        const newName = e.target.value;
                        if (value.type === 'object' && value.fields) {
                            // For object fields, update both the key and the name
                            const oldName = value.name;
                            const { [oldName]: fieldValue, ...restFields } = value.fields;
                            onChange({
                                ...value,
                                name: newName,
                                fields: {
                                    ...restFields,
                                    [newName]: fieldValue
                                }
                            });
                        } else {
                            onChange({ ...value, name: newName });
                        }
                    }}
                    placeholder="Field name"
                    className="flex-1 px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                />
                <select
                    value={value.type}
                    onChange={e => {
                        const type = e.target.value as ValueType;
                        if (type === 'object') {
                            onChange({ ...value, type: 'object', fields: {} });
                        } else if (type === 'array') {
                            onChange({ ...value, type: 'array', items: { name: 'item', type: 'string' } });
                        } else {
                            onChange({ ...value, type });
                        }
                    }}
                    className="px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                >
                    {VALUE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                    ×
                </button>
            </div>

            {value.type === 'object' && value.fields && (
                <div className="mt-2 space-y-2">
                    {Object.entries(value.fields).map(([key, field]) => (
                        <SchemaField
                            key={key}
                            value={field}
                            onChange={newValue => {
                                onChange({
                                    ...value,
                                    fields: {
                                        ...value.fields,
                                        [key]: newValue
                                    }
                                });
                            }}
                            onRemove={() => {
                                const { [key]: _, ...rest } = value.fields;
                                onChange({
                                    ...value,
                                    fields: rest
                                });
                            }}
                            indent={indent + 1}
                        />
                    ))}
                    <button
                        onClick={() => {
                            const newName = `New Field ${Object.keys(value.fields).length + 1}`;
                            onChange({
                                ...value,
                                fields: {
                                    ...value.fields,
                                    [newName]: { name: newName, type: 'string' }
                                }
                            });
                        }}
                        className="ml-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        + Add Field
                    </button>
                </div>
            )}

            {value.type === 'array' && value.items && (
                <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Array items:</span>
                    </div>
                    <SchemaField
                        value={value.items}
                        onChange={newValue => onChange({ ...value, items: newValue })}
                        onRemove={() => { }}
                        indent={indent + 1}
                    />
                </div>
            )}
        </div>
    );
};

interface VariableEditorProps {
    variables: WorkflowVariable[];
    onChange: (variables: WorkflowVariable[]) => void;
    title: string;
    description: string;
}

const VariableEditor: React.FC<VariableEditorProps> = ({
    variables = [],
    onChange,
    title,
    description
}) => {
    const [newVarName, setNewVarName] = useState('');
    const [selectedVar, setSelectedVar] = useState<string | null>(null);

    const handleAddVariable = () => {
        if (newVarName) {
            const newVar: WorkflowVariable = {
                id: `var-${Date.now()}`,
                name: newVarName,
                description: '',
                schema: {
                    name: newVarName,
                    type: 'string'
                }
            };
            onChange([...(variables || []), newVar]);
            setSelectedVar(newVar.id);
            setNewVarName('');
        }
    };

    const handleRemoveVariable = (id: string) => {
        onChange((variables || []).filter(v => v.id !== id));
        if (selectedVar === id) {
            setSelectedVar(null);
        }
    };

    const handleVariableChange = (id: string, updates: Partial<WorkflowVariable>) => {
        onChange((variables || []).map(v => {
            if (v.id !== id) return v;

            // If name is being updated, also update the schema name
            if (updates.name) {
                return {
                    ...v,
                    ...updates,
                    schema: {
                        ...v.schema,
                        name: updates.name
                    }
                };
            }

            return { ...v, ...updates };
        }));
    };

    return (
        <div className="space-y-6">
            {/* Variable Management UI */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Variable
                    </label>
                    <input
                        type="text"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                 bg-white dark:bg-gray-800 rounded-md 
                                 text-gray-900 dark:text-gray-100"
                        placeholder="Enter variable name"
                    />
                </div>
                <button
                    onClick={handleAddVariable}
                    disabled={!newVarName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md 
                             hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    Add Variable
                </button>
            </div>

            {/* Variables Display */}
            <div className="grid grid-cols-3 gap-6">
                {/* Variables List */}
                <div className="border border-gray-200 dark:border-gray-700 
                              bg-white dark:bg-gray-800/50 rounded-md p-4">
                    <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
                        {title}
                    </h3>
                    <div className="space-y-2">
                        {variables.map((variable) => (
                            <div
                                key={variable.id}
                                className="flex justify-between items-center p-2 
                                         hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
                            >
                                <button
                                    onClick={() => setSelectedVar(variable.id)}
                                    className={`flex-1 text-left ${selectedVar === variable.id
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {variable.name}
                                </button>
                                <button
                                    onClick={() => handleRemoveVariable(variable.id)}
                                    className="text-red-600 dark:text-red-400 
                                             hover:text-red-700 dark:hover:text-red-300"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Variable Editor */}
                {selectedVar && (
                    <div className="col-span-2 border border-gray-200 dark:border-gray-700 
                                  bg-white dark:bg-gray-800/50 rounded-md p-4">
                        {variables.map(variable => {
                            if (variable.id !== selectedVar) return null;
                            return (
                                <div key={variable.id} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Variable Name
                                        </label>
                                        <input
                                            value={variable.name}
                                            onChange={e => handleVariableChange(variable.id, { name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                                     bg-white dark:bg-gray-800 rounded-md 
                                                     text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={variable.description}
                                            onChange={e => handleVariableChange(variable.id, { description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                                     bg-white dark:bg-gray-800 rounded-md 
                                                     text-gray-900 dark:text-gray-100"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Schema
                                        </label>
                                        <SchemaField
                                            value={variable.schema}
                                            onChange={schema => handleVariableChange(variable.id, { schema })}
                                            onRemove={() => { }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const WorkflowConfig: React.FC<WorkflowConfigProps> = ({
    inputs = [],
    outputs = [],
    onInputChange,
    onOutputChange
}) => {
    const [activeTab, setActiveTab] = useState<'inputs' | 'outputs'>('inputs');

    console.log('WorkflowConfig');

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('inputs')}
                    className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors
                        ${activeTab === 'inputs'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Input Variables
                </button>
                <button
                    onClick={() => setActiveTab('outputs')}
                    className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors
                        ${activeTab === 'outputs'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Output Variables
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'inputs' ? (
                <VariableEditor
                    variables={inputs}
                    onChange={onInputChange}
                    title="Input Variables"
                    description="Define the input variables that will be used throughout the workflow."
                />
            ) : (
                <VariableEditor
                    variables={outputs}
                    onChange={onOutputChange}
                    title="Output Variables"
                    description="Define the output variables that will store results from workflow steps."
                />
            )}
        </div>
    );
};

export default WorkflowConfig; 