import React, { useState } from 'react';
import { SchemaValue, ValueType, PrimitiveType } from '../hooks/schema/types';

interface ValueEditorModalProps {
    value: SchemaValue;
    onSave: (value: SchemaValue) => void;
    onCancel: () => void;
}

const VALUE_TYPES: ValueType[] = ['string', 'number', 'boolean', 'array', 'object'];

const ValueEditorModal: React.FC<ValueEditorModalProps> = ({ value, onSave, onCancel }) => {
    const [editedValue, setEditedValue] = useState<SchemaValue>(value);

    const handleTypeChange = (type: ValueType) => {
        if (type === 'array') {
            setEditedValue({
                ...editedValue,
                type: 'array',
                items: { name: 'item', type: 'string' }
            });
        } else if (type === 'object') {
            setEditedValue({
                ...editedValue,
                type: 'object',
                fields: {}
            });
        } else {
            setEditedValue({
                ...editedValue,
                type: type as PrimitiveType
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Edit Value
                </h3>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={editedValue.name}
                            onChange={(e) => setEditedValue({ ...editedValue, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 rounded-md 
                                     text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type
                        </label>
                        <select
                            value={editedValue.type}
                            onChange={(e) => handleTypeChange(e.target.value as ValueType)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 rounded-md 
                                     text-gray-900 dark:text-gray-100"
                        >
                            {VALUE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Required */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={editedValue.required || false}
                            onChange={(e) => setEditedValue({ ...editedValue, required: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Required
                        </label>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(editedValue)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md 
                                 hover:bg-blue-700 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValueEditorModal; 