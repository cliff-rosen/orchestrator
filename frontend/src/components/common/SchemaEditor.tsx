import React, { useState, useEffect } from 'react';
import { PromptTemplateOutputSchema } from '../../types/prompts';

interface SchemaField {
    type: string;
    description?: string;
}

interface SchemaEditorProps {
    schema: PromptTemplateOutputSchema;
    onChange: (schema: PromptTemplateOutputSchema) => void;
}

interface EditingField {
    fieldName: string;
    value: string;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ schema, onChange }) => {
    const [editMode, setEditMode] = useState<'gui' | 'json'>('gui');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonText, setJsonText] = useState(() => {
        if (schema.type === 'object') {
            return JSON.stringify(schema.fields || {}, null, 2);
        }
        return '{}';
    });
    const [editingFieldName, setEditingFieldName] = useState<EditingField | null>(null);

    // Update JSON text when schema changes externally or mode switches
    useEffect(() => {
        if (schema.type === 'object') {
            setJsonText(JSON.stringify(schema.fields || {}, null, 2));
        } else {
            setJsonText('{}');
        }
    }, [schema, editMode]);

    const handleJsonChange = (text: string) => {
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setJsonError(null);
            onChange({
                ...schema,
                type: 'object',
                fields: parsed
            });
        } catch (err) {
            setJsonError('Invalid JSON format');
        }
    };

    const handleTypeChange = (type: 'string' | 'object') => {
        if (type === 'string') {
            onChange({
                type: 'string',
                description: schema.description
            });
        } else {
            onChange({
                type: 'object',
                description: schema.description,
                fields: {}
            });
        }
    };

    const handleAddField = () => {
        if (schema.type !== 'object') return;

        const currentFields = schema.fields || {};
        const newFields = {
            ...currentFields,
            [`field${Object.keys(currentFields).length + 1}`]: {
                type: 'string',
                description: ''
            }
        };
        onChange({
            ...schema,
            type: 'object',
            fields: newFields
        });
    };

    const handleRemoveField = (fieldName: string) => {
        if (schema.type !== 'object') return;

        const currentFields = schema.fields || {};
        const newFields = { ...currentFields };
        delete newFields[fieldName];
        onChange({
            ...schema,
            type: 'object',
            fields: newFields
        });
    };

    const handleFieldNameChange = (fieldName: string, value: string) => {
        setEditingFieldName({ fieldName, value });
    };

    const handleFieldNameBlur = () => {
        if (!editingFieldName || schema.type !== 'object') return;

        const { fieldName, value } = editingFieldName;
        if (fieldName === value || !value.trim()) {
            setEditingFieldName(null);
            return;
        }

        const currentFields = schema.fields || {};
        const entries = Object.entries(currentFields);
        const newFields: Record<string, SchemaField> = {};

        entries.forEach(([key, fieldValue]) => {
            if (key === fieldName) {
                newFields[value] = fieldValue;
            } else {
                newFields[key] = fieldValue;
            }
        });

        onChange({
            ...schema,
            type: 'object',
            fields: newFields
        });
        setEditingFieldName(null);
    };

    const handleFieldChange = (
        fieldName: string,
        property: 'type' | 'description',
        value: string
    ) => {
        if (schema.type !== 'object') return;
        const currentFields = schema.fields || {};

        onChange({
            ...schema,
            type: 'object',
            fields: {
                ...currentFields,
                [fieldName]: {
                    ...currentFields[fieldName],
                    [property]: value
                }
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                        Schema Type:
                    </label>
                    <select
                        value={schema.type}
                        onChange={(e) => handleTypeChange(e.target.value as 'string' | 'object')}
                        className="rounded-md border border-gray-300 dark:border-gray-600 
                                 shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 
                                 focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="string">String</option>
                        <option value="object">Object</option>
                    </select>

                    {schema.type === 'object' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditMode('gui')}
                                className={`px-3 py-1 text-sm rounded-md ${editMode === 'gui'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Visual Editor
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditMode('json')}
                                className={`px-3 py-1 text-sm rounded-md ${editMode === 'json'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                JSON Editor
                            </button>
                        </>
                    )}
                </div>
                {schema.type === 'object' && editMode === 'gui' && (
                    <button
                        type="button"
                        onClick={handleAddField}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Add Field
                    </button>
                )}
            </div>

            {schema.type === 'string' ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                    This schema will output a simple string value.
                </div>
            ) : editMode === 'json' ? (
                <div className="space-y-2">
                    <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        onBlur={() => handleJsonChange(jsonText)}
                        rows={8}
                        placeholder="Enter JSON schema"
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                 focus:border-blue-500 sm:text-sm font-mono dark:bg-gray-800
                                 text-gray-900 dark:text-gray-100"
                    />
                    {jsonError && (
                        <p className="text-sm text-red-600 dark:text-red-400">{jsonError}</p>
                    )}
                    <div className="flex justify-end">
                        <button
                            onClick={() => handleJsonChange(jsonText)}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                     dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            Apply Changes
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-4">
                        {Object.entries(schema.type === 'object' ? (schema.fields || {}) : {}).map(([fieldName, field]) => (
                            <div key={fieldName} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Field Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editingFieldName?.fieldName === fieldName ? editingFieldName.value : fieldName}
                                            onChange={(e) => handleFieldNameChange(fieldName, e.target.value)}
                                            onBlur={handleFieldNameBlur}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                                     shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 
                                                     focus:border-blue-500 dark:bg-gray-800
                                                     text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Type
                                        </label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => handleFieldChange(fieldName, 'type', e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                                     shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 
                                                     focus:border-blue-500 dark:bg-gray-800
                                                     text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            value={field.description || ''}
                                            onChange={(e) => handleFieldChange(fieldName, 'description', e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                                     shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 
                                                     focus:border-blue-500 dark:bg-gray-800
                                                     text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveField(fieldName)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchemaEditor; 