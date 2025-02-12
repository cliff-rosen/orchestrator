import React, { useState, useEffect, useCallback } from 'react';
import { PromptTemplate, PromptTemplateOutputSchema } from '../types/prompts';
import Dialog from './common/Dialog';
import SchemaEditor from './common/SchemaEditor';

interface PromptTemplateEditorProps {
    template: PromptTemplate | null;
    onSave: (template: Partial<PromptTemplate>, shouldClose: boolean) => Promise<void>;
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
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testParameters, setTestParameters] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<any>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Update editor state when template changes
    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setTemplateText(template.template);
            setOutputSchema(template.output_schema);
            if (template?.tokens) {
                const newParams: Record<string, string> = {};
                template.tokens.forEach(token => {
                    newParams[token] = '';
                });
                setTestParameters(newParams);
            }
        }
    }, [template]);

    // Generate output format instructions based on schema
    const generateOutputInstructions = useCallback((schema: PromptTemplateOutputSchema): string => {
        if (schema.type === 'string') {
            return 'Provide your response as plain text.';
        } else if (schema.type === 'object' && schema.fields) {
            const fieldDescriptions = Object.entries(schema.fields)
                .map(([key, field]) => `  "${key}": ${field.type}${field.description ? ` - ${field.description}` : ''}`)
                .join('\n');

            return `Provide your response in the following JSON format:
{
${fieldDescriptions}
}

Ensure your response is valid JSON and matches this schema exactly.`;
        }
        return '';
    }, []);

    const handleCopyInstructions = async () => {
        const instructions = generateOutputInstructions(outputSchema);
        try {
            await navigator.clipboard.writeText(instructions);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy instructions:', err);
        }
    };

    // Extract tokens from template text
    const extractTokens = (text: string): string[] => {
        const tokenRegex = /{{([^}]+)}}/g;
        const matches = text.matchAll(tokenRegex);
        return [...new Set([...matches].map(match => match[1]))];
    };

    // Handle template text changes
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
            }, false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndExitClick = async () => {
        try {
            setSaving(true);
            setError(null);

            await onSave({
                name,
                description,
                template: templateText,
                tokens: extractTokens(templateText),
                output_schema: outputSchema
            }, true);
            onCancel();
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

    return (
        <Dialog
            isOpen={true}
            title={template ? 'Edit Template' : 'Create Template'}
            onClose={onCancel}
            maxWidth="4xl"
        >
            <div className="space-y-6 min-w-[800px]">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                         shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                         focus:border-blue-500 sm:text-sm dark:bg-gray-800
                                         text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                Template
                            </label>
                        </div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Use double curly braces for variables (e.g. {"{{variableName}}"}). Separate multiple prompts with newlines.
                        </div>
                        <textarea
                            value={templateText}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            rows={8}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                     focus:border-blue-500 sm:text-sm font-mono dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>

                {/* Output Schema */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Output Type
                        </label>
                        <select
                            value={outputSchema.type}
                            onChange={(e) => {
                                const newType = e.target.value as 'string' | 'object';
                                setOutputSchema(newType === 'string'
                                    ? { type: 'string', description: outputSchema.description }
                                    : {
                                        type: 'object',
                                        description: outputSchema.description,
                                        fields: {}
                                    }
                                );
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                     focus:border-blue-500 sm:text-sm dark:bg-gray-800
                                     text-gray-900 dark:text-gray-100"
                        >
                            <option value="string" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Text</option>
                            <option value="object" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Structured (JSON)</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleCopyInstructions}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 
                                     hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 
                                     focus:outline-none"
                        >
                            {copySuccess ? (
                                <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copy Format Instructions
                                </span>
                            )}
                        </button>
                    </div>

                    {outputSchema.type === 'object' && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Output Schema
                            </label>
                            <SchemaEditor
                                schema={outputSchema}
                                onChange={setOutputSchema}
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

                        {/* Template Variables */}
                        {Object.keys(testParameters).length > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                    Template Variables
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.keys(testParameters).map((token) => (
                                        <div key={token} className="flex items-center space-x-2">
                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[150px]">
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

                        {testResult && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Result
                                </h4>
                                <pre className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-auto
                                              text-gray-900 dark:text-gray-100 max-h-[300px]">
                                    {JSON.stringify(testResult, null, 2)}
                                </pre>
                            </div>
                        )}
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
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 
                                 shadow-sm text-sm font-medium rounded-md text-gray-700 
                                 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 
                                 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 
                                 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveAndExitClick}
                        disabled={saving}
                        className="inline-flex justify-center py-2 px-4 border border-transparent 
                                 shadow-sm text-sm font-medium rounded-md text-white 
                                 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                                 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save & Exit'}
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default PromptTemplateEditor; 