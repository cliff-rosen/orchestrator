import React, { useState } from 'react';
import { SchemaManager, SchemaValue, ValueType, PrimitiveType } from '../hooks/schema/types';
import ValueDisplay from './ValueDisplay';
import ValueEditorModal from './ValueEditorModal';

interface SchemaEditorProps {
    stateManager: SchemaManager;
}

const PRIMITIVE_TYPES: PrimitiveType[] = ['string', 'number', 'boolean'];
const VALUE_TYPES: ValueType[] = [...PRIMITIVE_TYPES, 'array', 'object'];

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
            stateManager.setSchema(newKey, newValue);
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
        stateManager.setSchema(selectedKey, value);
        setShowValueEditor(false);
        setEditingValue(null);
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

                {/* Value Editor */}
                {selectedKey && stateManager.schemas && stateManager.schemas[selectedKey] && (
                    <div className="col-span-2 border border-gray-200 dark:border-gray-700 
                                  bg-white dark:bg-gray-800/50 rounded-md p-4">
                        <ValueDisplay
                            value={stateManager.schemas[selectedKey]}
                            onEdit={handleEditValue}
                        />
                    </div>
                )}
            </div>

            {/* Value Editor Modal */}
            {showValueEditor && editingValue && (
                <ValueEditorModal
                    value={editingValue}
                    onSave={handleSaveValue}
                    onCancel={() => setShowValueEditor(false)}
                />
            )}
        </div>
    );
};

export default SchemaEditor; 