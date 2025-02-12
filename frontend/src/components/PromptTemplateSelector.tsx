import React, { useState } from 'react';
import { PromptTemplate } from '../types/prompts';
import { WorkflowStep } from '../types/workflows';
import PromptTemplateEditor from './PromptTemplateEditor';

interface PromptTemplateSelectorProps {
    step: WorkflowStep;
    promptTemplates: PromptTemplate[];
    onTemplateChange: (templateId: string) => void;
    onTemplateUpdate: (template: PromptTemplate) => Promise<void>;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    step,
    promptTemplates,
    onTemplateChange,
    onTemplateUpdate
}) => {
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [saving, setSaving] = useState(false);

    if (!step.tool || step.tool.tool_type !== 'llm') {
        return null;
    }

    const selectedTemplate = step.prompt_template
        ? promptTemplates.find(t => t.template_id === step.prompt_template)
        : null;

    const handleSave = async (template: Partial<PromptTemplate>, shouldClose: boolean) => {
        try {
            setSaving(true);

            // If we have a template_id, this is an existing template being edited
            if (template.template_id && selectedTemplate) {
                // Merge the changes with the existing template
                const updatedTemplate = {
                    ...selectedTemplate,
                    ...template
                } as PromptTemplate;

                // Save the changes
                await onTemplateUpdate(updatedTemplate);

                // Refresh the current selection
                onTemplateChange(template.template_id);
            }

            if (shouldClose) {
                setShowTemplateEditor(false);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prompt Template
            </label>
            <div className="flex gap-2">
                <select
                    value={step.prompt_template || ''}
                    onChange={(e) => onTemplateChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                    <option key="default" value="" disabled>Select a prompt template</option>
                    {promptTemplates.map(template => (
                        <option key={template.template_id} value={template.template_id}
                            className="text-sm text-gray-900 dark:text-gray-100">
                            {template.name}
                        </option>
                    ))}
                </select>
                {selectedTemplate && (
                    <button
                        onClick={() => setShowTemplateEditor(true)}
                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 
                                 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-600 
                                 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 
                                 transition-colors duration-200"
                    >
                        View Template
                    </button>
                )}
            </div>

            {/* Template Editor */}
            {showTemplateEditor && selectedTemplate && (
                <PromptTemplateEditor
                    template={selectedTemplate}
                    onSave={handleSave}
                    onCancel={() => setShowTemplateEditor(false)}
                />
            )}
        </div>
    );
};

export default PromptTemplateSelector; 