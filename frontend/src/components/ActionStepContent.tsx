import React from 'react';
import { WorkflowStep } from '../types';
import { TOOL_SIGNATURES, PROMPT_TEMPLATES } from '../data';
import { SchemaManager } from '../hooks/schema/types';

interface ActionStepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
}

const formatValue = (value: any, type: string) => {
    if (type === 'string[]' && Array.isArray(value)) {
        return (
            <ul className="list-disc list-inside">
                {value.map((item, index) => (
                    <li key={index} className="text-sm">
                        {item}
                    </li>
                ))}
            </ul>
        );
    }
    return String(value);
};

// Add helper function to get tool signature
const getCurrentToolSignature = (tool: Tool): ToolSignature => {
    if (tool.type === 'llm') {
        return TOOL_SIGNATURES.llm(tool.promptTemplate);
    }
    return TOOL_SIGNATURES[tool.type];
};

const ActionStepContent: React.FC<ActionStepContentProps> = ({ step, stateManager }) => (
    <div>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {step.label}
        </h2>
        <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                Step Type: {step.stepType}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
        </div>

        {step.tool && (
            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Tool Configuration
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded 
                              border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Type:
                            </span>
                            <p className="text-gray-900 dark:text-gray-100">
                                {step.tool.type}
                            </p>
                        </div>
                        {step.tool.name && (
                            <div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Name:
                                </span>
                                <p className="text-gray-900 dark:text-gray-100">
                                    {step.tool.name}
                                </p>
                            </div>
                        )}
                    </div>
                    {step.tool.description && (
                        <div className="mt-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Description:
                            </span>
                            <p className="text-gray-900 dark:text-gray-100">
                                {step.tool.description}
                            </p>
                        </div>
                    )}

                    {/* LLM Prompt Template Display */}
                    {step.tool.type === 'llm' && step.tool.promptTemplate && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Prompt Template
                            </h4>
                            {(() => {
                                const template = PROMPT_TEMPLATES.find(t => t.id === step.tool?.promptTemplate);
                                if (!template) return null;

                                return (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Template:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {template.name}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Description:
                                            </span>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {template.description}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                Required tokens:
                                            </span>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                {template.tokens.map(token => (
                                                    <span
                                                        key={token}
                                                        className="px-2 py-1 bg-blue-50 text-blue-700 
                                                                 dark:bg-blue-900/30 dark:text-blue-300 
                                                                 rounded text-xs"
                                                    >
                                                        {`{{${token}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Parameter Mappings Display */}
                    {step.tool.parameterMappings &&
                        getCurrentToolSignature(step.tool).parameters.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Parameter Mappings
                                </h4>
                                <div className="space-y-2">
                                    {getCurrentToolSignature(step.tool).parameters.map(param => {
                                        const mappedKey = step.tool?.parameterMappings?.[param.name];
                                        const mappedValue = mappedKey ? stateManager.getValue(mappedKey) : null;

                                        return (
                                            <div key={param.name} className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {param.name}:
                                                    </span>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                                        mapped to "{mappedKey || 'not mapped'}"
                                                    </p>
                                                </div>
                                                {mappedValue !== null && (
                                                    <div className="flex-1">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            Current Value:
                                                        </span>
                                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                                            {formatValue(mappedValue, param.type)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    {/* Output Mappings Display */}
                    {step.tool.outputMappings &&
                        getCurrentToolSignature(step.tool).outputs.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Output Mappings
                                </h4>
                                <div className="space-y-2">
                                    {getCurrentToolSignature(step.tool).outputs.map(output => {
                                        const mappedKey = step.tool?.outputMappings?.[output.name];
                                        const mappedValue = mappedKey ? stateManager.getValue(mappedKey) : null;

                                        return (
                                            <div key={output.name} className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {output.name}:
                                                    </span>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                                        mapped to "{mappedKey || 'not mapped'}"
                                                    </p>
                                                </div>
                                                {mappedValue !== null && (
                                                    <div className="flex-1">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            Current Value:
                                                        </span>
                                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                                            {formatValue(mappedValue, output.type)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                </div>
            </div>
        )}

        <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                Current Schema State:
            </h3>
            <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded 
                          border border-gray-200 dark:border-gray-700 
                          text-gray-800 dark:text-gray-200">
                {JSON.stringify(stateManager.values, null, 2)}
            </pre>
        </div>
    </div>
);

export default ActionStepContent; 