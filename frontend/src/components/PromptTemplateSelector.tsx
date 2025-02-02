import React from 'react';
import { PromptTemplate } from '../types/prompts';
import { Tool } from '../types/tools';

interface PromptTemplateSelectorProps {
    tool: Tool;
    promptTemplates: PromptTemplate[];
    onTemplateChange: (templateId: string) => void;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    tool,
    promptTemplates,
    onTemplateChange
}) => {
    if (tool.tool_type !== 'llm') {
        return null;
    }

    return (
        <div className="space-y-2">
            hello
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prompt Template
            </label>
            <select
                value={tool.promptTemplate || ''}
                onChange={(e) => onTemplateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
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
        </div>
    );
};

export default PromptTemplateSelector; 