// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useEffect, useState } from 'react';
import { WorkflowStep, WorkflowVariableName } from '../types/workflows';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { toolApi, TOOL_TYPES } from '../lib/api/toolApi';
import PromptTemplateSelector from './PromptTemplateSelector';
import DataFlowMapper from './DataFlowMapper';
import { useWorkflows } from '../context/WorkflowContext';
import ToolSelector from './ToolSelector';

interface ActionStepEditorProps {
    step: WorkflowStep;
    onStepUpdate: (step: WorkflowStep) => void;
    onDeleteRequest: () => void;
}

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    step,
    onStepUpdate,
    onDeleteRequest
}) => {
    const { workflow } = useWorkflows();
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedToolType, setSelectedToolType] = useState<string | null>(step.tool?.tool_type || null);

    useEffect(() => {
        const loadTools = async () => {
            try {
                setLoading(true);
                const availableTools = await toolApi.getTools();
                setTools(availableTools);
            } catch (err) {
                console.error('Error loading tools:', err);
                setError('Failed to load tools');
            } finally {
                setLoading(false);
            }
        };
        loadTools();
    }, []);

    // Update selectedToolType when step changes
    useEffect(() => {
        setSelectedToolType(step.tool?.tool_type || null);
    }, [step]);

    const handleToolSelect = (tool: Tool) => {
        onStepUpdate({
            ...step,
            tool,
            tool_id: tool.tool_id,
            parameter_mappings: {},
            output_mappings: {},
            prompt_template_id: undefined
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        console.log('handleTemplateChange', templateId);
        if (!step.tool) return;

        try {
            const updatedStep = await toolApi.updateWorkflowStepWithTemplate(step, templateId);
            onStepUpdate(updatedStep);
        } catch (err) {
            console.error('Error updating step with template:', err);
        }
    };

    const handleParameterMappingChange = (mappings: Record<string, string>) => {
        console.log('handleParameterMappingChange', mappings);
        onStepUpdate({
            ...step,
            parameter_mappings: mappings as Record<ToolParameterName, WorkflowVariableName>
        });
    };

    const handleOutputMappingChange = (mappings: Record<string, string>) => {
        onStepUpdate({
            ...step,
            output_mappings: mappings as Record<ToolOutputName, WorkflowVariableName>
        });
    };

    // Function to get the tool type config
    const getToolTypeConfig = (typeId: string) => {
        return TOOL_TYPES.find(type => type.tool_type_id === typeId);
    };

    // Function to check if a tool belongs to a type
    const isToolOfType = (tool: Tool, typeId: string) => {
        const config = getToolTypeConfig(typeId);
        if (!config) return false;
        return tool.tool_type === typeId;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-4">{error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Step 1: Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Step Label
                        </label>
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => onStepUpdate({ ...step, label: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="Enter a descriptive label for this step"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={step.description}
                            onChange={(e) => onStepUpdate({ ...step, description: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={1}
                            placeholder="Describe what this step does"
                        />
                    </div>
                </div>
            </div>

            {/* Step 2: Tool Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <ToolSelector
                    tools={tools}
                    selectedTool={step.tool}
                    onSelect={handleToolSelect}
                    selectedToolType={selectedToolType}
                />
            </div>

            {/* Step 3: Prompt Template Selection (for LLM tools) */}
            {step.tool?.tool_type === 'llm' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Select Prompt Template
                    </h3>
                    <PromptTemplateSelector
                        step={step}
                        onTemplateChange={handleTemplateChange}
                    />
                </div>
            )}

            {/* Step 4: Parameter and Output Mapping */}
            {(step.tool && (step.tool.tool_type != 'llm' || step.prompt_template_id)) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Data Flow Configuration
                    </h3>
                    <DataFlowMapper
                        tool={step.tool}
                        parameter_mappings={step.parameter_mappings || {}}
                        output_mappings={step.output_mappings || {}}
                        inputs={workflow?.inputs || []}
                        outputs={workflow?.outputs || []}
                        onParameterMappingChange={handleParameterMappingChange}
                        onOutputMappingChange={handleOutputMappingChange}
                    />
                </div>
            )}
        </div>
    );
};

export default ActionStepEditor; 