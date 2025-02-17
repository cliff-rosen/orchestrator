import React, { useState } from 'react';
import { SchemaValue, ValueType } from '../types/schema';
import { WorkflowVariable, createBasicSchema, createArraySchema } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';
import { FileInfo } from '../lib/api/fileApi';
import Dialog from './common/Dialog';
import FileLibrary from './FileLibrary';
import { fileApi } from '../lib/api/fileApi';

const VALUE_TYPES: ValueType[] = ['string', 'number', 'boolean', 'file', 'object'];

interface SchemaFieldProps {
    value: SchemaValue;
    onChange: (value: SchemaValue) => void;
    onRemove: () => void;
    indent?: number;
    onFileSelect?: (file: FileInfo, value: SchemaValue) => void;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ value, onChange, onRemove, indent = 0, onFileSelect }) => {
    const [showFileSelector, setShowFileSelector] = useState(false);

    const handleTypeChange = (type: ValueType) => {
        if (value.array_type) {
            // If it's an array, just update the base type
            onChange({ ...value, type });
        } else {
            // If it's not an array, just update the type
            onChange(createBasicSchema(value.name, type, value.description));
        }
    };

    const handleArrayChange = (isArray: boolean) => {
        onChange({ ...value, array_type: isArray });
    };

    const handleFileSelect = (file: FileInfo) => {
        if (onFileSelect) {
            onFileSelect(file, value);
            setShowFileSelector(false);
        }
    };

    return (
        <div className="space-y-4" style={{ marginLeft: `${indent * 20}px` }}>
            <div className="flex items-center gap-4">
                <input
                    type="text"
                    value={value.name}
                    onChange={e => onChange({ ...value, name: e.target.value })}
                    placeholder="Name"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                />
                <select
                    value={value.type}
                    onChange={e => handleTypeChange(e.target.value as ValueType)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                >
                    {VALUE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={value.array_type}
                        onChange={e => handleArrayChange(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Is Array</span>
                </label>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                    ×
                </button>
            </div>

            {value.type === 'file' && onFileSelect && (
                <div className="mt-2">
                    <button
                        onClick={() => setShowFileSelector(true)}
                        className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                        {value.file_id ? 'Change File' : 'Select File'}
                    </button>
                    {value.file_id && (
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            Selected: {value.name}
                        </span>
                    )}

                    {showFileSelector && (
                        <Dialog
                            isOpen={showFileSelector}
                            onClose={() => setShowFileSelector(false)}
                            title="Select File"
                            maxWidth="2xl"
                        >
                            <FileLibrary
                                selectedFileId={value.file_id}
                                onFileSelect={async (fileId) => {
                                    try {
                                        const file = await fileApi.getFile(fileId);
                                        handleFileSelect(file);
                                    } catch (err) {
                                        console.error('Error fetching file:', err);
                                    }
                                }}
                            />
                        </Dialog>
                    )}
                </div>
            )}

            {value.type === 'object' && 'fields' in value && (
                <div className="ml-8 space-y-4">
                    {Object.entries(value.fields || {}).map(([fieldName, fieldValue]) => (
                        <SchemaField
                            key={fieldName}
                            value={fieldValue}
                            onChange={newValue => {
                                const newFields = { ...value.fields };
                                newFields[fieldName] = newValue;
                                onChange({ ...value, fields: newFields });
                            }}
                            onRemove={() => {
                                const { [fieldName]: removed, ...newFields } = value.fields || {};
                                onChange({ ...value, fields: newFields });
                            }}
                            indent={indent + 1}
                            onFileSelect={onFileSelect}
                        />
                    ))}
                    <button
                        onClick={() => {
                            const newFields = { ...value.fields };
                            const fieldName = `field${Object.keys(newFields).length + 1}`;
                            newFields[fieldName] = createBasicSchema(fieldName, 'string');
                            onChange({ ...value, fields: newFields });
                        }}
                        className="ml-8 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        + Add Field
                    </button>
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
    onFileSelect?: (file: FileInfo, value: SchemaValue) => void;
}

const VariableEditor: React.FC<VariableEditorProps> = ({
    variables = [],
    onChange,
    title,
    description,
    onFileSelect
}) => {
    const [newVarName, setNewVarName] = useState('');
    const [selectedVar, setSelectedVar] = useState<string | null>(null);

    const handleAddVariable = () => {
        if (newVarName) {
            const newVar: WorkflowVariable = {
                variable_id: `var-${Date.now()}`,
                schema: createBasicSchema(newVarName, 'string'),
                io_type: title.toLowerCase().includes('input') ? 'input' : 'output'
            };
            onChange([...variables, newVar]);
            setSelectedVar(newVar.variable_id);
            setNewVarName('');
        }
    };

    const handleRemoveVariable = (variable_id: string) => {
        onChange(variables.filter(v => v.variable_id !== variable_id));
        if (selectedVar === variable_id) {
            setSelectedVar(null);
        }
    };

    const handleVariableChange = (variable_id: string, updates: Partial<WorkflowVariable>) => {
        onChange(variables.map(v => {
            if (v.variable_id !== variable_id) return v;
            return { ...v, ...updates };
        }));
    };

    const handleFileSelect = (file: FileInfo, schema: SchemaValue) => {
        // Create updated schema while preserving array_type and other fields
        const updatedSchema = createBasicSchema(file.name, 'file', file.description || schema.description);
        updatedSchema.array_type = schema.array_type;
        updatedSchema.file_id = file.file_id;

        // Find and update the variable that contains this schema
        const updatedVariables = variables.map(variable => {
            if (variable.schema === schema) {
                return { ...variable, schema: updatedSchema };
            }
            return variable;
        });

        onChange(updatedVariables);
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                        placeholder="Enter variable name"
                    />
                </div>
                <button
                    onClick={handleAddVariable}
                    disabled={!newVarName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    Add Variable
                </button>
            </div>

            {/* Variables Display */}
            <div className="grid grid-cols-3 gap-6">
                {/* Variables List */}
                <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-md p-4">
                    <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
                        {title}
                    </h3>
                    <div className="space-y-2">
                        {variables.map((variable) => (
                            <div
                                key={variable.variable_id}
                                className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
                            >
                                <button
                                    onClick={() => setSelectedVar(variable.variable_id)}
                                    className={`flex-1 text-left ${selectedVar === variable.variable_id
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {variable.schema.name}
                                </button>
                                <button
                                    onClick={() => handleRemoveVariable(variable.variable_id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Variable Editor */}
                {selectedVar && (
                    <div className="col-span-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-md p-4">
                        {variables.map(variable => {
                            if (variable.variable_id !== selectedVar) return null;
                            return (
                                <div key={variable.variable_id} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Variable Name
                                        </label>
                                        <input
                                            value={variable.schema.name}
                                            onChange={e => handleVariableChange(variable.variable_id, {
                                                schema: { ...variable.schema, name: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={variable.schema.description || ''}
                                            onChange={e => handleVariableChange(variable.variable_id, {
                                                schema: { ...variable.schema, description: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Schema
                                        </label>
                                        <SchemaField
                                            value={variable.schema}
                                            onChange={schema => handleVariableChange(variable.variable_id, { schema })}
                                            onRemove={() => { }}
                                            onFileSelect={onFileSelect}
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

const WorkflowIOEditor: React.FC = () => {
    const { workflow, updateWorkflow } = useWorkflows();
    const inputs = workflow?.inputs || [];
    const outputs = workflow?.outputs || [];
    const [activeTab, setActiveTab] = useState<'inputs' | 'outputs'>('inputs');

    const handleInputChange = (newInputs: WorkflowVariable[]) => {
        if (!workflow) return;
        updateWorkflow({ inputs: newInputs });
    };

    const handleOutputChange = (newOutputs: WorkflowVariable[]) => {
        if (!workflow) return;
        updateWorkflow({ outputs: newOutputs });
    };

    const handleFileSelect = (file: FileInfo, schema: SchemaValue) => {
        // Create updated schema while preserving array_type and other fields
        const updatedSchema = createBasicSchema(file.name, 'file', file.description || schema.description);
        updatedSchema.array_type = schema.array_type;
        updatedSchema.file_id = file.file_id;

        // Find and update the variable that contains this schema
        const updatedVariables = (activeTab === 'inputs' ? inputs : outputs).map(variable => {
            // Deep clone the variable to avoid mutating state
            const newVariable = { ...variable };

            // Check if this variable's schema is the one being updated
            if (newVariable.schema === schema) {
                newVariable.schema = updatedSchema;
            }
            return newVariable;
        });

        // Update the workflow with the new variables
        if (activeTab === 'inputs') {
            handleInputChange(updatedVariables);
        } else {
            handleOutputChange(updatedVariables);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <div className="px-6 py-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Workflow I/O Configuration
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Configure the inputs and outputs for your workflow. Define what data your workflow needs and what it produces.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 flex gap-4">
                    <button
                        onClick={() => setActiveTab('inputs')}
                        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors flex items-center gap-2
                            ${activeTab === 'inputs'
                                ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Input Variables
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 
                                       text-blue-600 dark:text-blue-400">
                            {inputs.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('outputs')}
                        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors flex items-center gap-2
                            ${activeTab === 'outputs'
                                ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Output Variables
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 
                                       text-blue-600 dark:text-blue-400">
                            {outputs.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'inputs' ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Define the variables that will be used as input throughout your workflow steps.
                                You can use files, primitive types, arrays, and objects.
                            </p>
                        </div>
                        <VariableEditor
                            variables={inputs}
                            onChange={handleInputChange}
                            title="Input Variables"
                            description="Variables that must be provided before running the workflow"
                            onFileSelect={handleFileSelect}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Define the variables that will store the results produced by your workflow steps.
                                You can output files, primitive types, arrays, and objects.
                            </p>
                        </div>
                        <VariableEditor
                            variables={outputs}
                            onChange={handleOutputChange}
                            title="Output Variables"
                            description="Variables that will store workflow results"
                            onFileSelect={handleFileSelect}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowIOEditor; 