import React, { useState, useEffect } from 'react';
import { PromptTemplate } from '../types/prompts';
import { toolApi } from '../lib/api';
import PromptTemplateEditor from '../components/PromptTemplateEditor';

const PromptTemplatesPage: React.FC = () => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const fetchedTemplates = await toolApi.getPromptTemplates();
            setTemplates(fetchedTemplates);
        } catch (err) {
            setError('Failed to load templates');
            console.error('Error loading templates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleCreateNew = () => {
        setSelectedTemplate(null);
        setShowEditor(true);
    };

    const handleEdit = (template: PromptTemplate) => {
        setSelectedTemplate(template);
        setShowEditor(true);
    };

    const handleSave = async (templateData: Partial<PromptTemplate>) => {
        try {
            if (selectedTemplate) {
                // Update existing template
                await toolApi.updatePromptTemplate(selectedTemplate.template_id, templateData);
            } else {
                // Create new template
                await toolApi.createPromptTemplate(templateData);
            }
            setShowEditor(false);
            loadTemplates();
        } catch (err) {
            console.error('Error saving template:', err);
            throw err;
        }
    };

    const handleTest = async (templateData: Partial<PromptTemplate>, parameters: Record<string, string>) => {
        try {
            const result = await toolApi.testPromptTemplate(templateData, parameters);
            return result;
        } catch (err) {
            console.error('Error testing template:', err);
            throw err;
        }
    };

    const handleDelete = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            await toolApi.deletePromptTemplate(templateId);
            loadTemplates();
        } catch (err) {
            console.error('Error deleting template:', err);
            setError('Failed to delete template');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Prompt Templates
                </h1>
                <button
                    onClick={handleCreateNew}
                    className="inline-flex items-center px-4 py-2 border border-transparent 
                             text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 
                             hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                             focus:ring-blue-500"
                >
                    Create New Template
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {templates.map(template => (
                        <li key={template.template_id}>
                            <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {template.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {template.description}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {template.tokens.map(token => (
                                            <span
                                                key={token}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs 
                                                         font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 
                                                         dark:text-blue-200"
                                            >
                                                {token}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0 flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 
                                                 shadow-sm text-sm font-medium rounded-md text-gray-700 
                                                 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 
                                                 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 
                                                 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.template_id)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent 
                                                 text-sm font-medium rounded-md text-red-700 bg-red-100 
                                                 hover:bg-red-200 focus:outline-none focus:ring-2 
                                                 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 
                                                 dark:text-red-400 dark:hover:bg-red-900/30"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}

                    {templates.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No prompt templates yet. Click "Create New Template" to get started.
                        </li>
                    )}
                </ul>
            </div>

            {showEditor && (
                <PromptTemplateEditor
                    template={selectedTemplate}
                    onSave={handleSave}
                    onCancel={() => setShowEditor(false)}
                    onTest={handleTest}
                />
            )}
        </div>
    );
};

export default PromptTemplatesPage; 