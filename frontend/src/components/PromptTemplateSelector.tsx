import React, { useState } from 'react';
import { PromptTemplate } from '../types/prompts';
import { WorkflowStep } from '../types/workflows';
import Dialog from './common/Dialog';

interface PromptTemplateSelectorProps {
    step: WorkflowStep;
    promptTemplates: PromptTemplate[];
    onTemplateChange: (templateId: string) => void;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    step,
    promptTemplates,
    onTemplateChange
}) => {
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);

    if (!step.tool || step.tool.tool_type !== 'llm') {
        return null;
    }

    const selectedTemplate = step.prompt_template
        ? promptTemplates.find(t => t.template_id === step.prompt_template)
        : null;

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
                        onClick={() => setShowTemplateDialog(true)}
                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 
                                 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-600 
                                 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 
                                 transition-colors duration-200"
                    >
                        View Template
                    </button>
                )}
            </div>

            {/* Template Dialog */}
            {selectedTemplate && (
                <Dialog
                    isOpen={showTemplateDialog}
                    onClose={() => setShowTemplateDialog(false)}
                    title={selectedTemplate.name}
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedTemplate.description}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Template Content
                            </h4>
                            <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {selectedTemplate.template}
                            </pre>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Available Tokens
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedTemplate.tokens.map((token, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 
                                                 dark:text-blue-200 rounded-md"
                                    >
                                        {token}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
};

export default PromptTemplateSelector; 