// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useState, useEffect } from 'react';
import { Tool } from '../types/tools';
import { WorkflowStep } from '../types/workflows';
import { StateManager } from '../hooks/schema/types';
import { PromptTemplate } from '../types/prompts';
import { toolApi } from '../lib/api/toolApi';
import ToolSelector from './ToolSelector';
import ParameterMapper from './ParameterMapper';
import OutputMapper from './OutputMapper';
import PromptTemplateSelector from './PromptTemplateSelector';

interface ActionStepEditorProps {
    step: WorkflowStep;
    stateManager: StateManager;
    onStepUpdate: (step: WorkflowStep) => void;
    onDeleteRequest: () => void;
}

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    step,
    stateManager,
    onStepUpdate,
    onDeleteRequest
}) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const availableTools = await toolApi.getAvailableTools();
                setTools(availableTools);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching tools:', err);
                setError('Failed to load tools');
                setLoading(false);
            }
        };

        const fetchTemplates = async () => {
            try {
                const templates = await toolApi.getPromptTemplates();
                setPromptTemplates(templates);
            } catch (err) {
                console.error('Error fetching templates:', err);
                setError('Failed to load prompt templates');
            }
        };

        fetchTools();
        fetchTemplates();
    }, []);

    const handleToolSelect = (tool: Tool) => {
        onStepUpdate({
            ...step,
            tool,
            // Reset mappings when tool changes
            parameter_mappings: {},
            output_mappings: {}
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        if (!step.tool) return;

        const newSignature = await toolApi.updateLLMSignature(templateId);
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                signature: newSignature,
                promptTemplate: templateId
            },
            // Reset mappings when template changes
            parameter_mappings: {},
            output_mappings: {}
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

    const handleParameterMappingChange = (mappings: Record<string, string>) => {
        onStepUpdate({
            ...step,
            parameter_mappings: mappings
        });
    };

    const handleOutputMappingChange = (mappings: Record<string, string>) => {
        onStepUpdate({
            ...step,
            output_mappings: mappings
        });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Basic Information
                    </h3>
                    <button
                        onClick={onDeleteRequest}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                 border border-red-600 dark:border-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 
                                 transition-colors duration-200"
                        aria-label="Delete step"
                    >
                        Delete Step
                    </button>
                </div>
                <div className="space-y-4">
                    {/* Step Label */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Step Label
                        </label>
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => handleLabelChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="Enter step label"
                        />
                    </div>

                    {/* Step Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Step Description
                        </label>
                        <textarea
                            value={step.description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={3}
                            placeholder="Enter step description"
                        />
                    </div>
                </div>
            </div>

            {/* Tool Configuration Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Tool Configuration
                </h3>
                <div className="space-y-6">
                    {/* Tool Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Tool
                        </label>
                        <ToolSelector
                            tools={tools}
                            selectedTool={step.tool}
                            onSelect={handleToolSelect}
                        />
                    </div>

                    {/* Prompt Template Selection for LLM tools */}
                    {step.tool && (
                        <PromptTemplateSelector
                            tool={step.tool}
                            promptTemplates={promptTemplates}
                            onTemplateChange={handleTemplateChange}
                        />
                    )}

                    {step.tool && (
                        <>
                            {/* Parameter Mappings */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Parameter Mappings
                                </label>
                                <ParameterMapper
                                    tool={step.tool}
                                    parameter_mappings={step.parameter_mappings || {}}
                                    stateManager={stateManager}
                                    onChange={handleParameterMappingChange}
                                />
                            </div>

                            {/* Output Mappings */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Output Mappings
                                </label>
                                <OutputMapper
                                    tool={step.tool}
                                    output_mappings={step.output_mappings || {}}
                                    stateManager={stateManager}
                                    onChange={handleOutputMappingChange}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionStepEditor; 