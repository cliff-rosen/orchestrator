// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useEffect, useState } from 'react';
import { WorkflowStep } from '../types/workflows';
import { Tool } from '../types/tools';
import { toolApi, TOOL_TYPES } from '../lib/api/toolApi';
import PromptTemplateSelector from './PromptTemplateSelector';
import DataFlowMapper from './DataFlowMapper';
import { useWorkflows } from '../context/WorkflowContext';

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
                const availableTools = await toolApi.getAvailableTools();
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
            prompt_template: undefined
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        console.log('handleTemplateChange', templateId);
        if (!step.tool) return;

        const signature = await toolApi.createToolSignatureFromTemplate(templateId);

        // Only clear mappings if the parameters/outputs have changed
        const parameterMappings = { ...step.parameter_mappings };
        const outputMappings = { ...step.output_mappings };

        // Clear parameter mappings for parameters that no longer exist
        if (step.parameter_mappings) {
            Object.keys(step.parameter_mappings).forEach(param => {
                if (!signature.parameters.find(p => p.name === param)) {
                    delete parameterMappings[param];
                }
            });
        }

        // Clear output mappings for outputs that no longer exist
        if (step.output_mappings) {
            Object.keys(step.output_mappings).forEach(output => {
                if (!signature.outputs.find(o => o.name === output)) {
                    delete outputMappings[output];
                }
            });
        }

        onStepUpdate({
            ...step,
            prompt_template: templateId,
            parameter_mappings: parameterMappings,
            output_mappings: outputMappings,
            tool: {
                ...step.tool,
                signature
            }
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
        <div className="space-y-8">
            {/* Step 1: Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Step Information
                    </h3>
                    <button
                        onClick={onDeleteRequest}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 
                                 transition-colors duration-200"
                    >
                        Delete Step
                    </button>
                </div>
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

            {/* Step 2: Tool Type Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Select Tool Type
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TOOL_TYPES.map((type) => (
                        <button
                            key={type.tool_type_id}
                            onClick={() => {
                                setSelectedToolType(type.tool_type_id);
                                // If LLM is selected, automatically set the LLM tool
                                if (type.tool_type_id === 'llm') {
                                    const llmTool = tools.find(t => t.tool_type === 'llm');
                                    if (llmTool) handleToolSelect(llmTool);
                                }
                            }}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 text-left
                                ${selectedToolType === type.tool_type_id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{type.icon}</span>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        {type.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {type.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Tool Selection */}
            {selectedToolType && selectedToolType !== 'llm' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Select Tool
                    </h3>
                    <div className="space-y-3">
                        {getToolTypeConfig(selectedToolType)?.tools ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {getToolTypeConfig(selectedToolType)?.tools?.map(tool => (
                                    <button
                                        key={tool.tool_id}
                                        onClick={() => {
                                            const toolToUse = tools.find(t =>
                                                t.tool_id === tool.tool_id ||
                                                t.name.toLowerCase() === tool.name.toLowerCase()
                                            );
                                            if (toolToUse) handleToolSelect(toolToUse);
                                        }}
                                        className={`p-3 rounded-lg border text-left transition-colors
                                            ${(step.tool?.tool_id === tool.tool_id || step.tool?.name.toLowerCase() === tool.name.toLowerCase())
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {tool.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {tool.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <select
                                value={step.tool?.tool_id || ''}
                                onChange={(e) => {
                                    const tool = tools.find(t => t.tool_id === e.target.value);
                                    if (tool) handleToolSelect(tool);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Select a tool...</option>
                                {tools
                                    .filter(tool => isToolOfType(tool, selectedToolType))
                                    .map(tool => (
                                        <option key={tool.tool_id} value={tool.tool_id}>
                                            {tool.name}
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4: Prompt Template Selection (for LLM tools) */}
            {selectedToolType === 'llm' && step.tool && (
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

            {/* Step 5: Parameter and Output Mapping */}
            {step.tool && (
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