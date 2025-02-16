import React, { useState, useEffect, useCallback } from 'react';
import { PromptTemplate, PromptTemplateToken, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../types/prompts';
import { SchemaValue, PrimitiveValue, ObjectValue } from '../types/schema';
import Dialog from './common/Dialog';
import SchemaEditor from './common/SchemaEditor';
import { usePromptTemplates } from '../context/PromptTemplateContext';

interface PromptTemplateEditorProps {
    template: PromptTemplate | null;
    onTemplateChange?: (templateId: string) => void;
    onClose: () => void;
}

const defaultOutputSchema: SchemaValue = {
    type: 'string',
    name: 'output',
    description: 'Default output'
} as PrimitiveValue;

const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
    template,
    onTemplateChange,
    onClose
}) => {
    const { updateTemplate, createTemplate, setIsEditing, testTemplate } = usePromptTemplates();
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [userMessageTemplate, setUserMessageTemplate] = useState(template?.user_message_template || '');
    const [systemMessageTemplate, setSystemMessageTemplate] = useState(template?.system_message_template || '');
    const [tokens, setTokens] = useState<PromptTemplateToken[]>(template?.tokens || []);
    const [outputSchema, setOutputSchema] = useState<SchemaValue>(template?.output_schema || defaultOutputSchema);
    const [testParameters, setTestParameters] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description || '');
            setUserMessageTemplate(template.user_message_template);
            setSystemMessageTemplate(template.system_message_template || '');
            setTokens(template.tokens);
            setOutputSchema(template.output_schema);
            setTestParameters(
                template.tokens.reduce((acc, token) => ({
                    ...acc,
                    [token.name]: ''
                }), {})
            );
        }
    }, [template]);

    const extractTokens = useCallback((text: string, existingTokens: PromptTemplateToken[], source: string) => {
        const regularTokenRegex = /{{([^}]+)}}/g;
        const fileTokenRegex = /<<file:([^>]+)>>/g;

        const regularMatches = text.matchAll(regularTokenRegex);
        const fileMatches = text.matchAll(fileTokenRegex);

        const regularTokens = [...new Set([...regularMatches].map(m => ({
            name: m[1],
            type: 'string' as const
        })))];

        const fileTokens = [...new Set([...fileMatches].map(m => ({
            name: m[1],
            type: 'file' as const
        })))];

        return [...regularTokens, ...fileTokens];
    }, []);

    const updateTokens = useCallback((userTemplate: string, systemTemplate: string) => {
        const userTokens = extractTokens(userTemplate, tokens, 'user');
        const systemTokens = extractTokens(systemTemplate, tokens, 'system');

        // Merge tokens, keeping only unique ones by name
        const uniqueTokens = [...userTokens, ...systemTokens].reduce((acc, token) => {
            if (!acc.find(t => t.name === token.name)) {
                acc.push(token);
            }
            return acc;
        }, [] as PromptTemplateToken[]);

        setTokens(uniqueTokens);
    }, [tokens, extractTokens]);

    const handleUserMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setUserMessageTemplate(newText);
        updateTokens(newText, systemMessageTemplate);
    }, [systemMessageTemplate, updateTokens]);

    const handleSystemMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setSystemMessageTemplate(newText);
        updateTokens(userMessageTemplate, newText);
    }, [userMessageTemplate, updateTokens]);

    const handleClose = () => {
        setIsOpen(false);
        onClose();
    };

    const handleSave = async () => {
        try {
            const templateData: PromptTemplateCreate | PromptTemplateUpdate = {
                name,
                description,
                user_message_template: userMessageTemplate,
                system_message_template: systemMessageTemplate,
                tokens,
                output_schema: outputSchema,
                ...(template?.template_id ? { template_id: template.template_id } : {})
            };

            if (template?.template_id) {
                await updateTemplate(template.template_id, templateData as PromptTemplateUpdate);
            } else {
                const newTemplate = await createTemplate(templateData as PromptTemplateCreate);
                onTemplateChange?.(newTemplate.template_id);
            }
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        }
    };

    const handleTest = async () => {
        try {
            setError('');
            const testData: PromptTemplateTest = {
                user_message_template: userMessageTemplate,
                system_message_template: systemMessageTemplate,
                tokens,
                output_schema: outputSchema,
                parameters: testParameters
            };
            const result = await testTemplate(template?.template_id || '', testData);
            setTestResult(JSON.stringify(result, null, 2));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to test template');
        }
    };

    const handleSchemaChange = (newSchema: SchemaValue) => {
        setOutputSchema(newSchema);
    };

    return (
        <Dialog
            isOpen={isOpen}
            title={template?.template_id ? 'Edit Template' : 'Create Template'}
            onClose={handleClose}
            maxWidth="4xl"
        >
            <div className="space-y-4 p-4">
                {/* Template Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Template Name</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter template name"
                    />
                </div>

                {/* Template Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter template description"
                    />
                </div>

                {/* System Message Template */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">System Message Template (Optional)</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows={3}
                        value={systemMessageTemplate}
                        onChange={handleSystemMessageChange}
                        placeholder="Enter system message template. You can use {{token}} for string tokens and <<file:token>> for file tokens."
                    />
                </div>

                {/* User Message Template */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">User Message Template</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        rows={10}
                        value={userMessageTemplate}
                        onChange={handleUserMessageChange}
                        placeholder="Enter your template text using {{token}} for string tokens and <<file:token>> for file tokens"
                    />
                </div>

                {/* Tokens list */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tokens</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {tokens.map(token => (
                            <span
                                key={token.name}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${token.type === 'string'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}
                            >
                                {token.name} ({token.type})
                            </span>
                        ))}
                    </div>
                </div>

                {/* Output schema editor */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Output Schema</label>
                    <SchemaEditor
                        schema={outputSchema}
                        onChange={handleSchemaChange}
                    />
                </div>

                {/* Test section */}
                <div className="border-t pt-4">
                    <h3 className="text-lg font-medium">Test Template</h3>
                    <div className="mt-2 space-y-4">
                        {tokens.map(token => (
                            <div key={token.name}>
                                <label className="block text-sm font-medium text-gray-700">
                                    {token.name} ({token.type})
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    value={testParameters[token.name] || ''}
                                    onChange={(e) => setTestParameters({
                                        ...testParameters,
                                        [token.name]: e.target.value
                                    })}
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleTest}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Test
                        </button>
                        {testResult && (
                            <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto">
                                {testResult}
                            </pre>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="text-red-600 text-sm mt-2">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default PromptTemplateEditor; 