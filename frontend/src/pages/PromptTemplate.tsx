import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import MenuBar from '../components/MenuBar';
import SchemaEditor from '../components/common/SchemaEditor';
import { extractTokens } from '../lib/utils';
import PromptMenuBar from '../components/PromptMenuBar';

const PromptTemplate: React.FC = () => {
    const { templateId } = useParams();
    const navigate = useNavigate();
    const {
        templates,
        selectedTemplate: template,
        setSelectedTemplate,
        createTemplate,
        updateTemplate,
        testTemplate,
        refreshTemplates
    } = usePromptTemplates();

    // State
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [templateText, setTemplateText] = useState(template?.template || '');
    const [outputSchema, setOutputSchema] = useState(template?.output_schema || { type: 'string', description: '' });
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testParameters, setTestParameters] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize template based on URL parameter
    useEffect(() => {
        if (!templateId) {
            navigate('/');
            return;
        }

        // Only load if we don't have this template or it's a different one
        if (!template || (template.template_id !== templateId && templateId !== 'new')) {
            const loadTemplate = async () => {
                try {
                    const foundTemplate = templates.find(t => t.template_id === templateId);
                    if (foundTemplate) {
                        setSelectedTemplate(foundTemplate);
                        setName(foundTemplate.name);
                        setDescription(foundTemplate.description);
                        setTemplateText(foundTemplate.template);
                        setOutputSchema(foundTemplate.output_schema);
                        if (foundTemplate.tokens) {
                            const newParams: Record<string, string> = {};
                            foundTemplate.tokens.forEach(token => {
                                newParams[token] = '';
                            });
                            setTestParameters(newParams);
                        }
                    } else {
                        setError('Template not found');
                        navigate('/');
                    }
                } catch (err) {
                    console.error('Error loading template:', err);
                    setError('Failed to load template');
                    navigate('/');
                }
            };
            loadTemplate();
        }
    }, [templateId, navigate, templates, template, setSelectedTemplate]);

    // Update test parameters when template text changes
    useEffect(() => {
        const tokens = extractTokens(templateText);
        const newParams: Record<string, string> = {};
        tokens.forEach(token => {
            // Preserve existing values if they exist
            newParams[token] = testParameters[token] || '';
        });
        setTestParameters(newParams);
    }, [templateText]);

    // Update hasUnsavedChanges when form values change
    useEffect(() => {
        if (!template) {
            setHasUnsavedChanges(name !== '' || description !== '' || templateText !== '');
            return;
        }

        setHasUnsavedChanges(
            name !== template.name ||
            description !== template.description ||
            templateText !== template.template ||
            JSON.stringify(outputSchema) !== JSON.stringify(template.output_schema)
        );
    }, [template, name, description, templateText, outputSchema]);

    // Prompt user before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleBack = async () => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm('You have unsaved changes. Do you want to save before leaving?');
            if (shouldSave) {
                try {
                    await handleSave();
                    navigate('/prompts');
                } catch (err) {
                    console.error('Error saving template:', err);
                    if (window.confirm('Failed to save changes. Leave anyway?')) {
                        navigate('/prompts');
                    }
                }
            } else {
                navigate('/prompts');
            }
        } else {
            navigate('/prompts');
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const templateData = {
                name,
                description,
                template: templateText,
                tokens: extractTokens(templateText),
                output_schema: outputSchema
            };

            if (template?.template_id && template.template_id !== 'new') {
                await updateTemplate(template.template_id, templateData);
            } else {
                const newTemplate = await createTemplate(templateData);
                navigate(`/prompt/${newTemplate.template_id}`);
            }
            await refreshTemplates();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            setError(null);

            const result = await testTemplate({
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

    if (!template && templateId !== 'new') return null;

    return (
        <div className="flex flex-col h-full">
            <PromptMenuBar
                name={name}
                isSaving={saving}
                isTesting={testing}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleSave}
                onTest={handleTest}
                onBack={handleBack}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 py-6">
                    <div className="space-y-6">
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

                            {/* Template */}
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
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    rows={8}
                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                             shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 
                                             focus:border-blue-500 sm:text-sm font-mono dark:bg-gray-800
                                             text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            {/* Output Schema */}
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

                                {outputSchema.type === 'object' && (
                                    <div className="mt-4">
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
                            {Object.keys(testParameters).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        Test Template
                                    </h3>

                                    {/* Template Variables */}
                                    <div>
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
                                    onClick={() => navigate('/prompts')}
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
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent 
                                             shadow-sm text-sm font-medium rounded-md text-white 
                                             bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                                             focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptTemplate; 