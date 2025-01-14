import React, { useState } from 'react';
import { SchemaManager, SchemaValue, ValueType } from '../hooks/schema/types';

interface SchemaEditorProps {
    stateManager: SchemaManager;
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
                    onChange={e => onChange({ ...value, name: e.target.value })}
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
                    className="px-3 py-2 text-red-600 dark:text-red-400 
                             hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                >
                    Remove
                </button>
            </div>

            {value.type === 'object' && (
                <div className="pl-4 border-l-2 border-gray-300 dark:border-gray-600 space-y-2">
                    {Object.entries(value.fields).map(([fieldName, fieldValue]) => (
                        <SchemaField
                            key={fieldName}
                            value={fieldValue}
                            onChange={newValue => {
                                onChange({
                                    ...value,
                                    fields: {
                                        ...value.fields,
                                        [fieldName]: newValue
                                    }
                                });
                            }}
                            onRemove={() => {
                                const { [fieldName]: _, ...rest } = value.fields;
                                onChange({ ...value, fields: rest });
                            }}
                            indent={indent + 1}
                        />
                    ))}
                    <button
                        onClick={() => {
                            const newField = { name: '', type: 'string' };
                            onChange({
                                ...value,
                                fields: {
                                    ...value.fields,
                                    [`field${Object.keys(value.fields).length}`]: newField
                                }
                            });
                        }}
                        className="text-blue-600 dark:text-blue-400 
                                 hover:bg-blue-50 dark:hover:bg-blue-900/30 
                                 px-3 py-1 rounded-md"
                    >
                        Add Field
                    </button>
                </div>
            )}

            {value.type === 'array' && (
                <div className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        Array Item Type:
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

const SchemaEditor: React.FC<SchemaEditorProps> = ({ stateManager }) => {
    const [newKey, setNewKey] = useState('');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [showValueEditor, setShowValueEditor] = useState(false);
    const [editingValue, setEditingValue] = useState<SchemaValue | null>(null);

    const handleAddKey = () => {
        if (newKey) {
            const newValue: SchemaValue = {
                name: newKey,
                type: 'string'
            };
            stateManager.setSchema(newKey, newValue, 'input');
            setSelectedKey(newKey);
            setNewKey('');
        }
    };

    const handleRemoveKey = (key: string) => {
        stateManager.removeSchema(key);
        if (selectedKey === key) {
            setSelectedKey(null);
        }
    };

    const handleEditValue = (value: SchemaValue) => {
        setEditingValue(value);
        setShowValueEditor(true);
    };

    const handleSaveValue = (value: SchemaValue) => {
        if (!selectedKey) return;
        stateManager.setSchema(selectedKey, value, 'input');
        setShowValueEditor(false);
        setEditingValue(null);
    };

    const handleSchemaChange = (key: string, schema: SchemaValue) => {
        stateManager.setSchema(key, schema, 'input');
    };

    return (
        <div className="space-y-6">
            {/* Key Management UI */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Schema Key
                    </label>
                    <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                 bg-white dark:bg-gray-800 rounded-md 
                                 text-gray-900 dark:text-gray-100"
                        placeholder="Enter key name"
                    />
                </div>
                <button
                    onClick={handleAddKey}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md 
                             hover:bg-blue-700 transition-colors"
                >
                    Add Key
                </button>
            </div>

            {/* Schema Display */}
            <div className="grid grid-cols-3 gap-6">
                {/* Keys List */}
                <div className="border border-gray-200 dark:border-gray-700 
                              bg-white dark:bg-gray-800/50 rounded-md p-4">
                    <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
                        Schema Keys
                    </h3>
                    <div className="space-y-2">
                        {stateManager.schemas && Object.entries(stateManager.schemas).map(([key, value]) => (
                            <div
                                key={key}
                                className="flex justify-between items-center p-2 
                                         hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
                            >
                                <button
                                    onClick={() => setSelectedKey(key)}
                                    className={`flex-1 text-left ${selectedKey === key
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {key}
                                </button>
                                <button
                                    onClick={() => handleRemoveKey(key)}
                                    className="text-red-600 dark:text-red-400 
                                             hover:text-red-700 dark:hover:text-red-300"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Schema Editor */}
                {selectedKey && stateManager.schemas && stateManager.schemas[selectedKey] && (
                    <div className="col-span-2 border border-gray-200 dark:border-gray-700 
                                  bg-white dark:bg-gray-800/50 rounded-md p-4">
                        <SchemaField
                            value={stateManager.schemas[selectedKey].schema}
                            onChange={value => handleSchemaChange(selectedKey, value)}
                            onRemove={() => stateManager.removeSchema(selectedKey)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchemaEditor; 