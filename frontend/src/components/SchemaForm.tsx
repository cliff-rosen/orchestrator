import React from 'react';
import { SchemaValue } from '../types/schema';
import FileLibrary from './FileLibrary';

interface SchemaFormProps {
    schema: SchemaValue;
    value: any;
    onChange: (value: any) => void;
}

const SchemaForm: React.FC<SchemaFormProps> = ({ schema, value, onChange }) => {
    if (schema.type === 'object') {
        const objectValue = value || {};
        return (
            <div className="space-y-4">
                {Object.entries(schema.fields).map(([fieldName, fieldSchema]) => (
                    <div key={fieldName}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {fieldSchema.name}
                        </label>
                        <SchemaForm
                            schema={fieldSchema}
                            value={objectValue[fieldName]}
                            onChange={newValue => onChange({
                                ...objectValue,
                                [fieldName]: newValue
                            })}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (schema.type === 'array') {
        const arrayValue = Array.isArray(value) ? value : [];
        return (
            <div className="space-y-2">
                {arrayValue.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <SchemaForm
                            schema={schema.items}
                            value={item}
                            onChange={newValue => {
                                const newArray = [...arrayValue];
                                newArray[index] = newValue;
                                onChange(newArray);
                            }}
                        />
                        <button
                            onClick={() => {
                                onChange(arrayValue.filter((_, i) => i !== index));
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700"
                        >
                            Remove
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => onChange([...arrayValue, null])}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                    Add Item
                </button>
            </div>
        );
    }

    if (schema.type === 'file') {
        return (
            <FileLibrary
                selectedFileId={value?.file_id}
                onFileSelect={(fileId) => onChange({ file_id: fileId })}
            />
        );
    }

    if (schema.type === 'string') {
        return (
            <input
                type="text"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
        );
    }

    if (schema.type === 'number') {
        return (
            <input
                type="number"
                value={value || ''}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
        );
    }

    if (schema.type === 'boolean') {
        return (
            <input
                type="checkbox"
                checked={value || false}
                onChange={e => onChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 
                         rounded focus:ring-blue-500 dark:focus:ring-blue-400"
            />
        );
    }

    return null;
};

export default SchemaForm; 