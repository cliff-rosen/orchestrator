import React, { useState, useMemo } from 'react';
import { WorkflowStep } from '../types/workflows';
import PromptTemplateEditor from './PromptTemplateEditor';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import { toolApi } from '../lib/api/toolApi';

interface PromptTemplateSelectorProps {
    step: WorkflowStep;
    onTemplateChange: (templateId: string) => void;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    step,
    onTemplateChange,
}) => {
    const { templates } = usePromptTemplates();
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    if (!step.tool || step.tool.tool_type !== 'llm') {
        return null;
    }

    const currentTemplate = useMemo(() =>
        templates.find(t => t.template_id === step.prompt_template),
        [templates, step.prompt_template]
    );

    const handleTemplateSelect = async (templateId: string) => {
        if (templateId === 'new') {
            setIsCreating(true);
        } else {
            try {
                await toolApi.updateWorkflowStepWithTemplate(step, templateId);
                onTemplateChange(templateId);
            } catch (err) {
                console.error('Error updating step with template:', err);
            }
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
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                    <option key="default" value="" disabled>Select a prompt template</option>
                    <option key="new" value="new" className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        + New Template
                    </option>
                    {templates.map(template => (
                        <option key={template.template_id} value={template.template_id}
                            className="text-sm text-gray-900 dark:text-gray-100">
                            {template.name}
                        </option>
                    ))}
                </select>

                {currentTemplate && (
                    <button
                        onClick={() => setIsEditing(true)}
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
            {isEditing && currentTemplate && (
                <PromptTemplateEditor
                    template={currentTemplate}
                    onTemplateChange={onTemplateChange}
                    onClose={() => setIsEditing(false)}
                />
            )}

            {/* New Template Creator */}
            {isCreating && (
                <PromptTemplateEditor
                    template={null}
                    onTemplateChange={onTemplateChange}
                    onClose={() => setIsCreating(false)}
                />
            )}
        </div>
    );
};

export default PromptTemplateSelector; 