import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PromptTemplate, PromptTemplateToken, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../types/prompts';
import { SchemaValue, PrimitiveValue, ObjectValue } from '../types/schema';
import Dialog from './common/Dialog';
import SchemaEditor from './common/SchemaEditor';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import FileLibrary from '../components/FileLibrary';
import { fileApi } from '../lib/api/fileApi';

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
    const nameInputRef = useRef<HTMLInputElement>(null);
    const { updateTemplate, createTemplate, testTemplate } = usePromptTemplates();
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
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedTokenName, setSelectedTokenName] = useState<string | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string>>({});
    const [isTesting, setIsTesting] = useState(false);

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

    useEffect(() => {
        if (nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, []);

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
            setIsTesting(true);
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
        } finally {
            setIsTesting(false);
        }
    };

    const handleSchemaChange = (newSchema: SchemaValue) => {
        setOutputSchema(newSchema);
    };

    // Load file names for file values
    useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const [tokenName, value] of Object.entries(testParameters)) {
                if (tokens.find(t => t.name === tokenName)?.type === 'file' && value) {
                    try {
                        const fileInfo = await fileApi.getFile(value);
                        newFileNames[value] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames);
        };
        loadFileNames();
    }, [testParameters, tokens]);

    const handleFileSelect = (fileId: string) => {
        if (selectedTokenName) {
            setTestParameters(prev => ({
                ...prev,
                [selectedTokenName]: fileId
            }));
            setShowFileSelector(false);
            setSelectedTokenName(null);
        }
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
                    <input
                        ref={nameInputRef}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter template name"
                    />
                </div>

                {/* Template Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter template description"
                    />
                </div>

                {/* System Message Template */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">System Message Template (Optional)</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={3}
                        value={systemMessageTemplate}
                        onChange={handleSystemMessageChange}
                        placeholder="Enter system message template. You can use {{token}} for string tokens and <<file:token>> for file tokens."
                    />
                </div>

                {/* User Message Template */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Message Template</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={10}
                        value={userMessageTemplate}
                        onChange={handleUserMessageChange}
                        placeholder="Enter your template text using {{token}} for string tokens and <<file:token>> for file tokens"
                    />
                </div>

                {/* Tokens list */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tokens</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {tokens.map(token => (
                            <span
                                key={token.name}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${token.type === 'string'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                    }`}
                            >
                                {token.name} ({token.type})
                            </span>
                        ))}
                    </div>
                </div>

                {/* Output schema editor */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Output Schema</label>
                    <SchemaEditor
                        schema={outputSchema}
                        onChange={handleSchemaChange}
                    />
                </div>

                {/* Test section */}
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Test Template</h3>
                    <div className="mt-2 space-y-4">
                        {tokens.map(token => (
                            <div key={token.name}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {token.name} ({token.type})
                                </label>
                                {token.type === 'file' ? (
                                    <div className="mt-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                                     focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            value={fileNames[testParameters[token.name]] || 'No file selected'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedTokenName(token.name);
                                                setShowFileSelector(true);
                                            }}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
                                                     shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 
                                                     bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Select File
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm 
                                                 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        value={testParameters[token.name] || ''}
                                        onChange={(e) => setTestParameters({
                                            ...testParameters,
                                            [token.name]: e.target.value
                                        })}
                                    />
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={isTesting}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium 
                                     rounded-md shadow-sm text-white
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                     transition-colors duration-200
                                     ${isTesting
                                    ? 'bg-indigo-400 dark:bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                {isTesting && (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isTesting ? 'Testing...' : 'Test'}
                            </span>
                        </button>
                        {testResult && (
                            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto 
                                          text-gray-900 dark:text-gray-100 text-sm">
                                {testResult}
                            </pre>
                        )}
                    </div>
                </div>

                {/* File Selector Dialog */}
                {showFileSelector && (
                    <Dialog
                        isOpen={showFileSelector}
                        onClose={() => {
                            setShowFileSelector(false);
                            setSelectedTokenName(null);
                        }}
                        title="Select a File"
                        maxWidth="2xl"
                    >
                        <div className="p-4">
                            <FileLibrary
                                onFileSelect={handleFileSelect}
                            />
                        </div>
                    </Dialog>
                )}

                {error && (
                    <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                                 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 
                                 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium 
                                 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default PromptTemplateEditor; 