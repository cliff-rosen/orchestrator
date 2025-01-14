import React from 'react';
import { WorkflowStep, Tool, ToolType, ToolParameter } from '../types';
import { TOOL_SIGNATURES, PROMPT_TEMPLATES } from '../data';
import { SchemaManager, SchemaValue } from '../hooks/schema/types';

const TOOL_TYPES: ToolType[] = ['llm', 'search', 'retrieve'];

interface ActionEditorProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: WorkflowStep) => void;
}

const createSchemaForType = (name: string, type: string): SchemaValue => {
    if (type === 'string[]') {
        return {
            name,
            type: 'array' as const,
            items: {
                name: 'item',
                type: 'string' as const
            }
        };
    }
    return {
        name,
        type: type as 'string' | 'number' | 'boolean'
    };
};

const ActionEditor: React.FC<ActionEditorProps> = ({
    step,
    stateManager,
    onStepUpdate
}) => {
    // Add state to force re-render when schema changes
    const [schemaVersion, setSchemaVersion] = React.useState(0);

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

    const handleOutputMappingChange = (outputName: string, schemaKey: string) => {
        if (!step.tool) return;

        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                outputMappings: {
                    ...step.tool.outputMappings,
                    [outputName]: schemaKey
                }
            }
        });
    };

    const handleCreateNewField = (output: ToolParameter) => {
        const baseName = output.name;
        let fieldName = baseName;
        let counter = 1;

        // Ensure unique field name
        while (stateManager.schemas && stateManager.schemas[fieldName]) {
            fieldName = `${baseName}${counter}`;
            counter++;
        }

        // Create new schema field with proper type structure
        stateManager.setSchema(
            fieldName,
            createSchemaForType(fieldName, output.type),
            'output'
        );

        // Map the output to the new field
        if (step.tool) {
            onStepUpdate({
                ...step,
                tool: {
                    ...step.tool,
                    outputMappings: {
                        ...step.tool.outputMappings,
                        [output.name]: fieldName
                    }
                }
            });
        }

        // Force re-render to update available fields
        setSchemaVersion(v => v + 1);
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
    }, [stateManager.schemas, schemaVersion]); // Add schemaVersion to dependencies

    const handlePromptTemplateChange = (templateId: string) => {
        if (!step.tool) return;

        // Clear existing parameter mappings when template changes
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                promptTemplate: templateId,
                parameterMappings: {}  // Reset mappings for new template
            }
        });
    };

    // Get the current tool signature, handling dynamic LLM case
    const getCurrentToolSignature = (tool: Tool): ToolSignature => {
        if (tool.type === 'llm') {
            return TOOL_SIGNATURES.llm(tool.promptTemplate);
        }
        return TOOL_SIGNATURES[tool.type];
    };

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

            {/* Prompt Template Selection for LLM */}
            {step.tool?.type === 'llm' && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prompt Template
                    </label>
                    <select
                        value={step.tool.promptTemplate || ''}
                        onChange={(e) => handlePromptTemplateChange(e.target.value)}
                        className="w-full px-3 py-2 
                                 border border-gray-300 dark:border-gray-600
                                 bg-white dark:bg-gray-700 
                                 text-gray-900 dark:text-gray-100
                                 rounded-md"
                    >
                        <option value="">Select a template</option>
                        {PROMPT_TEMPLATES.map(template => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                    {step.tool.promptTemplate && (
                        <div className="mt-2 space-y-2">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {PROMPT_TEMPLATES.find(t => t.id === step.tool?.promptTemplate)?.description}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Required tokens:
                                </span>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {PROMPT_TEMPLATES.find(t => t.id === step.tool?.promptTemplate)?.tokens.map(token => (
                                        <span
                                            key={token}
                                            className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 
                                                     dark:text-blue-300 rounded text-xs"
                                        >
                                            {`{{${token}}}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Template text:
                                </span>
                                <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-900/50 
                                      border border-gray-200 dark:border-gray-700 
                                      text-gray-800 dark:text-gray-200 rounded-md 
                                      whitespace-pre-wrap text-sm">
                                    {PROMPT_TEMPLATES.find(t => t.id === step.tool?.promptTemplate)?.template}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Token Mapping UI - only show after template is selected */}
                    {step.tool.promptTemplate && (
                        <div className="mt-4 space-y-4">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Token Mappings
                            </h3>
                            <div className="space-y-4">
                                {getCurrentToolSignature(step.tool).parameters.map(param => {
                                    const availableKeys = getAvailableSchemaKeys('string');

                                    return (
                                        <div key={param.name} className="space-y-1">
                                            <label className="block text-sm text-gray-600 dark:text-gray-400">
                                                {`{{${param.name}}}`}
                                                <span className="ml-2 text-xs text-gray-500">
                                                    ({param.description})
                                                </span>
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
                </div>
            )}

            {/* Parameter Mapping UI - only show for non-LLM tools */}
            {step.tool && step.tool.type !== 'llm' &&
                getCurrentToolSignature(step.tool).parameters.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Input Parameter Mappings
                        </h3>
                        <div className="space-y-4">
                            {getCurrentToolSignature(step.tool).parameters.map(param => {
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
                                            value={step.tool.parameterMappings?.[param.name] || ''}
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
            {step.tool && getCurrentToolSignature(step.tool).outputs.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Output Mappings
                    </h3>
                    <div className="space-y-4">
                        {getCurrentToolSignature(step.tool).outputs.map(output => {
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
                                            value={step.tool.outputMappings?.[output.name] || ''}
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
                                        <button
                                            onClick={() => handleCreateNewField(output)}
                                            className="px-3 py-2 bg-blue-50 text-blue-600 
                                                     dark:bg-blue-900/30 dark:text-blue-400
                                                     hover:bg-blue-100 dark:hover:bg-blue-900/50 
                                                     rounded-md whitespace-nowrap"
                                        >
                                            Create New Field
                                        </button>
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