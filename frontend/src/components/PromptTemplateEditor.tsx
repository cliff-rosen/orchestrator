import React, { useState, useEffect } from 'react';
import { PromptTemplate, PromptTemplateOutputSchema } from '../types/prompts';
import Dialog from './common/Dialog';

interface PromptTemplateEditorProps {
    template: PromptTemplate | null;
    onSave: (template: Partial<PromptTemplate>) => Promise<void>;
    onCancel: () => void;
    onTest?: (template: Partial<PromptTemplate>, parameters: Record<string, string>) => Promise<any>;
}

const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
    template,
    onSave,
    onCancel,
    onTest
}) => {
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [templateText, setTemplateText] = useState(template?.template || '');
    const [outputSchema, setOutputSchema] = useState<PromptTemplateOutputSchema>(
        template?.output_schema || { type: 'string', description: '' }
    );
    const [testParameters, setTestParameters] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract tokens from template text
    const extractTokens = (text: string): string[] => {
        const tokenRegex = /{{([^}]+)}}/g;
        const matches = text.matchAll(tokenRegex);
        return [...new Set([...matches].map(match => match[1]))];
    };

    // Initialize test parameters when component loads or template changes
    useEffect(() => {
        const tokens = extractTokens(templateText);
        setTestParameters(prev => {
            const newParams: Record<string, string> = {};
            tokens.forEach(token => {
                newParams[token] = prev[token] || '';
            });
            return newParams;
        });
    }, [templateText]);

    const handleSaveClick = async () => {
        try {
            setSaving(true);
            setError(null);

            await onSave({
                name,
                description,
                template: templateText,
                tokens: extractTokens(templateText),
                output_schema: outputSchema
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!onTest) return;

        setTesting(true);
        try {
            setError(null);

            const result = await onTest({
                template: templateText,
                tokens: extractTokens(templateText),
                output_schema: outputSchema
            }, testParameters);
            setTestResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to test template');
        } finally {
            setTesting(false);
        }
    };

    const handleTemplateChange = (content: string) => {
        setTemplateText(content);
        // Update test parameters based on tokens
        const tokens = extractTokens(content);
        setTestParameters(prev => {
            const newParams: Record<string, string> = {};
            tokens.forEach(token => {
                newParams[token] = prev[token] || '';
            });
            return newParams;
        });
    };

    return (
        <Dialog
            isOpen={true}
            title={template ? 'Edit Template' : 'Create Template'}
            onClose={onCancel}
        >
            <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                     focus:border-blue-500 sm:text-sm dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                     focus:border-blue-500 sm:text-sm dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Template
                        </label>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Use double curly braces for variables (e.g. {"{{variableName}}"}). Separate multiple prompts with newlines.
                        </div>
                        <textarea
                            value={templateText}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            rows={6}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                     focus:border-blue-500 sm:text-sm font-mono dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Display extracted variables */}
                    {Object.keys(testParameters).length > 0 && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                Template Variables
                            </label>
                            <div className="mt-2 space-y-2">
                                {Object.keys(testParameters).map((token) => (
                                    <div key={token} className="flex items-center space-x-2">
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                                            {"{{"}{token}{"}}"}
                                        </span>
                                        <input
                                            type="text"
                                            value={testParameters[token]}
                                            onChange={(e) => setTestParameters(prev => ({
                                                ...prev,
                                                [token]: e.target.value
                                            }))}
                                            placeholder={`Value for ${token}`}
                                            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 
                                                     shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 
                                                     focus:border-blue-500 dark:bg-gray-800
                                                     text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Output Schema */}
                <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Output Type
                    </label>
                    <select
                        value={outputSchema.type}
                        onChange={(e) => setOutputSchema(prev => ({
                            ...prev,
                            type: e.target.value as 'string' | 'object'
                        }))}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                 focus:border-blue-500 sm:text-sm dark:bg-gray-800
                                 text-gray-900 dark:text-gray-100"
                    >
                        <option value="string" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Text</option>
                        <option value="object" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Structured (JSON)</option>
                    </select>

                    {outputSchema.type === 'object' && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                Output Schema
                            </label>
                            <textarea
                                value={JSON.stringify(outputSchema.schema || {}, null, 2)}
                                onChange={(e) => {
                                    try {
                                        const schema = JSON.parse(e.target.value);
                                        setOutputSchema(prev => ({
                                            ...prev,
                                            schema
                                        }));
                                    } catch (err) {
                                        // Invalid JSON, ignore
                                    }
                                }}
                                rows={6}
                                placeholder="Enter JSON schema for structured output"
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                         shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                         focus:border-blue-500 sm:text-sm font-mono dark:bg-gray-800
                                         text-gray-900 dark:text-gray-100 placeholder-gray-400 
                                         dark:placeholder-gray-500"
                            />
                        </div>
                    )}
                </div>

                {/* Test Section */}
                {onTest && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Test Template
                        </h3>

                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={testing}
                            className="inline-flex justify-center py-2 px-4 border border-transparent 
                                     shadow-sm text-sm font-medium rounded-md text-white 
                                     bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                                     focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {testing ? 'Testing...' : 'Test Template'}
                        </button>
                    </div>
                )}

                {testResult && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Result
                        </h4>
                        <pre className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-auto
                                      text-gray-900 dark:text-gray-100">
                            {JSON.stringify(testResult, null, 2)}
                        </pre>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 
                                 shadow-sm text-sm font-medium rounded-md text-gray-700 
                                 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 
                                 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 
                                 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={saving}
                        className="inline-flex justify-center py-2 px-4 border border-transparent 
                                 shadow-sm text-sm font-medium rounded-md text-white 
                                 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                                 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default PromptTemplateEditor; 