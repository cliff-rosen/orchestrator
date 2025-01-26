// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useState, useEffect } from 'react';
import {
    Tool,
    WorkflowStep,
    ParameterMappingType,
    OutputMappingType
} from '../types';
import { SchemaManager } from '../hooks/schema/types';
import { PromptTemplate } from '../types/prompts';
import { toolApi } from '../lib/api';
import ToolSelector from './ToolSelector';
import ParameterMapper from './ParameterMapper';
import OutputMapper from './OutputMapper';

interface ActionStepEditorProps {
    tools: Tool[];
    step: WorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: WorkflowStep) => void;
}

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    tools,
    step,
    stateManager,
    onStepUpdate,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                setLoading(true);
                const templates = await toolApi.getPromptTemplates();
                setPromptTemplates(templates);
            } catch (err) {
                console.error('Error fetching templates:', err);
                setError('Failed to load prompt templates');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    const handleToolSelect = (selectedTool: Tool) => {
        onStepUpdate({
            ...step,
            tool: {
                ...selectedTool,
                parameterMappings: {},
                outputMappings: {}
            }
        });
    };

    const handleTemplateChange = (templateId: string) => {
        if (!step.tool) return;

        const newSignature = toolApi.updateLLMSignature(templateId);
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                signature: newSignature,
                promptTemplate: templateId,
                parameterMappings: {},
                outputMappings: {}
            }
        });
    };

    const handleLabelChange = (label: string) => {
        onStepUpdate({
            ...step,
            label
        });
    };

    const handleDescriptionChange = (description: string) => {
        onStepUpdate({
            ...step,
            description
        });
    };

    const handleParameterChange = (mappings: Record<string, string>) => {
        if (!step.tool) return;
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                parameterMappings: mappings as unknown as ParameterMappingType
            }
        });
    };

    const handleOutputChange = (mappings: Record<string, string>) => {
        if (!step.tool) return;
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                outputMappings: mappings as unknown as OutputMappingType
            }
        });
    };

    if (loading) {
        return <div className="text-gray-700 dark:text-gray-300">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-600 dark:text-red-400">{error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Step Label
                </label>
                <input
                    type="text"
                    value={step.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter step label"
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Step Description
                </label>
                <textarea
                    value={step.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    rows={3}
                    placeholder="Enter step description"
                />
            </div>

            <ToolSelector
                tools={tools}
                selectedTool={step.tool}
                onSelect={handleToolSelect}
            />

            {step.tool?.type === 'llm' && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prompt Template
                    </label>
                    <select
                        value={step.tool.promptTemplate || ''}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="" disabled>Select a prompt template</option>
                        {promptTemplates.map(template => (
                            <option key={template.id} value={template.id}
                                className="text-gray-900 dark:text-gray-100">
                                {template.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {step.tool && (
                <>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Parameters</h3>
                        <ParameterMapper
                            tool={step.tool}
                            parameterMappings={step.tool.parameterMappings || {}}
                            stateManager={stateManager}
                            onChange={handleParameterChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h3>
                        <OutputMapper
                            tool={step.tool}
                            parameterMappings={step.tool.outputMappings || {}}
                            stateManager={stateManager}
                            onChange={handleOutputChange}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default ActionStepEditor; 