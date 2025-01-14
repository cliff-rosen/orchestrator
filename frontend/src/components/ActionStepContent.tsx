import React from 'react';
import { WorkflowStep, TOOL_SIGNATURES } from '../data';
import { SchemaManager } from '../hooks/schema/types';

interface ActionStepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
}

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
                              border border-gray-200 dark:border-gray-700">
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

                    {/* Parameter Mappings Display */}
                    {step.tool.parameterMappings && 
                     TOOL_SIGNATURES[step.tool.type].parameters.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Parameter Mappings
                            </h4>
                            <div className="space-y-2">
                                {TOOL_SIGNATURES[step.tool.type].parameters.map(param => {
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
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                                        {String(mappedValue)}
                                                    </p>
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