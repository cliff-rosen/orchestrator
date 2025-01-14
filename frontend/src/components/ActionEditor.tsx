import React from 'react';
import { WorkflowStep, Tool, ToolType, TOOL_SIGNATURES } from '../data';
import { SchemaManager } from '../hooks/schema/types';

const TOOL_TYPES: ToolType[] = ['llm', 'search', 'retrieve'];

interface ActionEditorProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: WorkflowStep) => void;
}

const ActionEditor: React.FC<ActionEditorProps> = ({
    step,
    stateManager,
    onStepUpdate
}) => {
    const handleToolChange = (type: ToolType) => {
        const newTool: Tool = {
            type,
            name: `${type} Tool`,
            description: `Default ${type} tool configuration`,
            parameterMappings: {}
        };
        onStepUpdate({
            ...step,
            tool: newTool
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

    const handleParameterMappingChange = (paramName: string, schemaKey: string) => {
        if (!step.tool) return;

        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                parameterMappings: {
                    ...step.tool.parameterMappings,
                    [paramName]: schemaKey
                }
            }
        });
    };

    // Get available schema keys for mapping
    const availableSchemaKeys = stateManager.schemas
        ? Object.entries(stateManager.schemas)
            .filter(([_, entry]) => entry.schema.type === 'string')  // For now, only show string fields
            .map(([key]) => key)
        : [];

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
                    className="w-full px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
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
                    className="w-full px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                    rows={3}
                    placeholder="Enter step description"
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tool Type
                </label>
                <select
                    value={step.tool?.type || ''}
                    onChange={(e) => handleToolChange(e.target.value as ToolType)}
                    className="w-full px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                >
                    <option value="" disabled>Select a tool</option>
                    {TOOL_TYPES.map(toolType => (
                        <option key={toolType} value={toolType}>
                            {toolType}
                        </option>
                    ))}
                </select>
            </div>

            {/* Parameter Mapping UI */}
            {step.tool && TOOL_SIGNATURES[step.tool.type].parameters.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Parameter Mappings
                    </h3>
                    <div className="space-y-4">
                        {TOOL_SIGNATURES[step.tool.type].parameters.map(param => (
                            <div key={param.name} className="space-y-1">
                                <label className="block text-sm text-gray-600 dark:text-gray-400">
                                    {param.name}
                                    {param.description && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({param.description})
                                        </span>
                                    )}
                                </label>
                                <select
                                    value={step.tool.parameterMappings?.[param.name] || ''}
                                    onChange={(e) => handleParameterMappingChange(param.name, e.target.value)}
                                    className="w-full px-3 py-2 
                                             border border-gray-300 dark:border-gray-600
                                             bg-white dark:bg-gray-700 
                                             text-gray-900 dark:text-gray-100
                                             rounded-md"
                                >
                                    <option value="">Select a field</option>
                                    {availableSchemaKeys.map(key => (
                                        <option key={key} value={key}>
                                            {key}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionEditor; 