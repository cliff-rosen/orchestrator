import React, { useState, useEffect } from 'react';
import {
    WorkflowStep,
    Tool,
    ToolType,
    ToolParameter,
    ToolSignature,
    ToolParameterName,
    ToolOutputName,
    WorkflowVariableName
} from '../types';
import { toolApi } from '../lib/api';
import { SchemaManager } from '../hooks/schema/types';

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
    // Add state to force re-render when schema changes
    const [schemaVersion, setSchemaVersion] = React.useState(0);
    const [availableTools, setAvailableTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch available tools
    useEffect(() => {
        const fetchTools = async () => {
            try {
                setLoading(true);
                const tools = await toolApi.getAvailableTools();
                setAvailableTools(tools);
            } catch (err) {
                console.error('Error fetching tools:', err);
                setError('Failed to load tools');
            } finally {
                setLoading(false);
            }
        };

        fetchTools();
    }, []);

    const handleToolChange = (toolId: string) => {
        const selectedTool = availableTools.find(t => t.id === toolId);
        if (!selectedTool) return;

        onStepUpdate({
            ...step,
            tool: {
                ...selectedTool,
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

    const handleParameterMappingChange = (paramName: string, schemaKey: string) => {
        if (!step.tool) return;

        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                parameterMappings: {
                    ...step.tool.parameterMappings,
                    [paramName as ToolParameterName]: schemaKey as WorkflowVariableName
                }
            }
        });
    };

    const handleOutputMappingChange = (outputName: string, schemaKey: string) => {
        if (!step.tool) return;

        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                outputMappings: {
                    ...step.tool.outputMappings,
                    [outputName as ToolOutputName]: schemaKey as WorkflowVariableName
                }
            }
        });
    };

    // Get available schema keys for mapping based on parameter type
    const getAvailableSchemaKeys = React.useCallback((paramType: string) => {
        if (!stateManager.schemas) return [];

        return Object.entries(stateManager.schemas)
            .filter(([_, entry]) => {
                if (paramType === 'string[]') {
                    return entry.schema.type === 'array' &&
                        entry.schema.items?.type === 'string';
                }
                return entry.schema.type === paramType;
            })
            .map(([key]) => key);
    }, [stateManager.schemas, schemaVersion]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    // Type guard to ensure tool and signature are defined
    const tool = step.tool;
    if (!tool?.signature) {
        return (
            <div className="space-y-4">
                {/* Label and Description inputs */}
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

                {/* Tool Selection */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tool
                    </label>
                    <select
                        value={step.tool?.id || ''}
                        onChange={(e) => handleToolChange(e.target.value)}
                        className="w-full px-3 py-2 
                                 border border-gray-300 dark:border-gray-600
                                 bg-white dark:bg-gray-700 
                                 text-gray-900 dark:text-gray-100
                                 rounded-md"
                    >
                        <option value="" disabled>Select a tool</option>
                        {availableTools.map(tool => (
                            <option key={tool.id} value={tool.id}>
                                {tool.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    const hasParameters = tool.signature.parameters.length > 0;
    const hasOutputs = tool.signature.outputs.length > 0;

    return (
        <div className="space-y-4">
            {/* Label and Description inputs */}
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

            {/* Tool Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tool
                </label>
                <select
                    value={tool.id}
                    onChange={(e) => handleToolChange(e.target.value)}
                    className="w-full px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                >
                    <option value="" disabled>Select a tool</option>
                    {availableTools.map(tool => (
                        <option key={tool.id} value={tool.id}>
                            {tool.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Parameter Mapping UI */}
            {hasParameters && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Input Parameter Mappings
                    </h3>
                    <div className="space-y-4">
                        {tool.signature.parameters.map((param: ToolParameter) => {
                            const availableKeys = getAvailableSchemaKeys(param.type);

                            return (
                                <div key={param.name} className="space-y-1">
                                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                                        {param.name}
                                        {param.description && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({param.description})
                                            </span>
                                        )}
                                        <span className="ml-2 text-xs text-gray-500">
                                            Type: {param.type}
                                        </span>
                                    </label>
                                    <select
                                        value={tool.parameterMappings?.[param.name as ToolParameterName] || ''}
                                        onChange={(e) => handleParameterMappingChange(param.name, e.target.value)}
                                        className="w-full px-3 py-2 
                                                 border border-gray-300 dark:border-gray-600
                                                 bg-white dark:bg-gray-700 
                                                 text-gray-900 dark:text-gray-100
                                                 rounded-md"
                                    >
                                        <option value="">Select a field</option>
                                        {availableKeys.map(key => (
                                            <option key={key} value={key}>
                                                {key}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Output Mapping UI */}
            {hasOutputs && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Output Mappings
                    </h3>
                    <div className="space-y-4">
                        {tool.signature.outputs.map((output: ToolParameter) => {
                            const availableKeys = getAvailableSchemaKeys(output.type);

                            return (
                                <div key={output.name} className="space-y-1">
                                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                                        {output.name}
                                        {output.description && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({output.description})
                                            </span>
                                        )}
                                        <span className="ml-2 text-xs text-gray-500">
                                            Type: {output.type}
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={tool.outputMappings?.[output.name as ToolOutputName] || ''}
                                            onChange={(e) => handleOutputMappingChange(output.name, e.target.value)}
                                            className="flex-1 px-3 py-2 
                                                     border border-gray-300 dark:border-gray-600
                                                     bg-white dark:bg-gray-700 
                                                     text-gray-900 dark:text-gray-100
                                                     rounded-md"
                                        >
                                            <option value="">Select a field</option>
                                            {availableKeys.map(key => (
                                                <option key={key} value={key}>
                                                    {key}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionEditor; 