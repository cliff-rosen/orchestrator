import React, { useState } from 'react';
import { SchemaManager, FieldDefinition } from '../hooks/schema/types';

interface SchemaEditorProps {
    stateManager: SchemaManager;
}

interface SchemaKeyEntry {
    key: string;
    schema: FieldDefinition[];
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ stateManager }) => {
    const [newKey, setNewKey] = useState('');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Convert state object to array for easier rendering
    const schemaEntries = Object.entries(stateManager.state).map(([key, entry]) => ({
        key,
        schema: entry.schema
    }));

    const handleAddKey = () => {
        if (newKey && !stateManager.state[newKey]) {
            stateManager.setSchema(newKey, []);
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

    const handleAddField = (key: string) => {
        const currentSchema = stateManager.state[key]?.schema || [];
        const newField: FieldDefinition = {
            name: `field${currentSchema.length + 1}`,
            type: 'string',
            label: `Field ${currentSchema.length + 1}`,
            required: false
        };

        stateManager.setSchema(key, [...currentSchema, newField]);
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Schema Key
                    </label>
                    <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter key name"
                    />
                </div>
                <button
                    onClick={handleAddKey}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Add Key
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Schema Keys List */}
                <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-4">Schema Keys</h3>
                    <div className="space-y-2">
                        {schemaEntries.map(({ key }) => (
                            <div
                                key={key}
                                className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                            >
                                <button
                                    onClick={() => setSelectedKey(key)}
                                    className={`flex-1 text-left ${selectedKey === key ? 'text-blue-600' : ''}`}
                                >
                                    {key}
                                </button>
                                <button
                                    onClick={() => handleRemoveKey(key)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Schema Editor */}
                {selectedKey && (
                    <div className="col-span-2 border rounded-md p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">Schema for: {selectedKey}</h3>
                            <button
                                onClick={() => handleAddField(selectedKey)}
                                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Add Field
                            </button>
                        </div>
                        <div className="space-y-4">
                            {stateManager.state[selectedKey]?.schema.map((field, index) => (
                                <div key={index} className="p-4 border rounded-md">
                                    <pre>{JSON.stringify(field, null, 2)}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchemaEditor; 