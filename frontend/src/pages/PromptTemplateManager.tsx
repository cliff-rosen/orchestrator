import React from 'react';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import PromptTemplateEditor from '../components/PromptTemplateEditor';

const PromptTemplateManager: React.FC = () => {
    const {
        templates,
        selectedTemplate,
        setSelectedTemplate,
        isEditing,
        setIsEditing,
        deleteTemplate
    } = usePromptTemplates();

    const handleCreateNew = () => {
        setSelectedTemplate(null);
        setIsEditing(true);
    };

    const handleEdit = (templateId: string) => {
        const template = templates.find(t => t.template_id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setIsEditing(true);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Prompt Templates
                </h1>
                <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Create New Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                    <div
                        key={template.template_id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {template.name}
                            </h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEdit(template.template_id)}
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 
                                             dark:hover:text-blue-300"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteTemplate(template.template_id)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 
                                             dark:hover:text-red-300"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {template.description}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            {template.tokens?.length} variables • {
                                template.output_schema.type === 'object'
                                    ? `${Object.keys(template.output_schema.fields || {}).length} output fields`
                                    : 'Text output'
                            }
                        </div>
                    </div>
                ))}
            </div>

            {isEditing && (
                <PromptTemplateEditor
                    template={selectedTemplate}
                />
            )}
        </div>
    );
};

export default PromptTemplateManager; 