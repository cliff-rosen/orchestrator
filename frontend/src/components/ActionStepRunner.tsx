// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React from 'react';
import { SchemaManager } from '../hooks/schema/types';
import { RuntimeWorkflowStep } from '../types/workflows';

interface ActionStepRunnerProps {
    actionStep: RuntimeWorkflowStep;
    stateManager: SchemaManager;
}

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    stateManager
}) => {
    if (!actionStep.tool) {
        return <div className="text-gray-500 dark:text-gray-400">No tool selected</div>;
    }

    // Get input and output variable names from parameter and output mappings
    const inputVarNames = actionStep.parameterMappings ? Object.values(actionStep.parameterMappings) : [];
    const outputVarNames = actionStep.outputMappings ? Object.values(actionStep.outputMappings) : [];

    // Get current values for input and output variables
    const inputValues = inputVarNames.reduce((acc, varName) => {
        acc[varName] = stateManager.getValue(varName);
        return acc;
    }, {} as Record<string, any>);

    const outputValues = outputVarNames.reduce((acc, varName) => {
        acc[varName] = stateManager.getValue(varName);
        return acc;
    }, {} as Record<string, any>);

    return (
        <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Tool Info */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {actionStep.tool.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {actionStep.tool.description}
                </p>
            </div>

            {/* Parameters Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Parameters</h4>
                <div className="grid grid-cols-2 gap-6">
                    {/* Parameter Mappings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Parameter Mappings
                        </h5>
                        <div className="space-y-2">
                            {actionStep.parameterMappings && Object.entries(actionStep.parameterMappings).map(([paramName, varName]) => (
                                <div key={paramName} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{paramName}:</span>
                                    <span className="text-gray-600 dark:text-gray-400 font-mono">{String(varName)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Current Input Values */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Current Values
                        </h5>
                        <div className="space-y-2">
                            {Object.entries(inputValues).map(([varName, value]) => (
                                <div key={varName} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{varName}:</span>
                                    <span className="text-gray-600 dark:text-gray-400 font-mono">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h4>
                <div className="grid grid-cols-2 gap-6">
                    {/* Output Mappings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Output Mappings
                        </h5>
                        <div className="space-y-2">
                            {actionStep.outputMappings && Object.entries(actionStep.outputMappings).map(([outputName, varName]) => (
                                <div key={outputName} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{outputName}:</span>
                                    <span className="text-gray-600 dark:text-gray-400 font-mono">{String(varName)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Current Output Values */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Current Values
                        </h5>
                        <div className="space-y-2">
                            {Object.entries(outputValues).map(([varName, value]) => (
                                <div key={varName} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{varName}:</span>
                                    <span className="text-gray-600 dark:text-gray-400 font-mono">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActionStepRunner; 