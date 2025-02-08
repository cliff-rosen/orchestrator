// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';

interface ActionStepRunnerProps {
    actionStep: RuntimeWorkflowStep;
}

// Helper function to format values for display
const formatValue = (value: any): JSX.Element => {
    if (Array.isArray(value)) {
        return (
            <div className="space-y-2">
                {value.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        <div className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap">
                            {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (typeof value === 'object') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap">
                    {JSON.stringify(value, null, 2)}
                </div>
            </div>
        );
    }

    if (typeof value === 'string' && value.length > 100) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap">
                    {value}
                </div>
            </div>
        );
    }

    return <span className="text-gray-600 dark:text-gray-300 font-mono">{String(value)}</span>;
};

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
}) => {
    const { workflow } = useWorkflows();

    // Get input values from workflow variables
    const inputValues: Record<string, any> = {};
    if (actionStep.parameter_mappings) {
        Object.entries(actionStep.parameter_mappings).forEach(([paramName, varName]) => {
            const variable = workflow?.inputs?.find(v => v.name === varName) ||
                workflow?.outputs?.find(v => v.name === varName);
            inputValues[varName] = variable?.value;
        });
    }

    // Get output values from workflow variables
    const outputValues: Record<string, any> = {};
    if (actionStep.output_mappings) {
        Object.entries(actionStep.output_mappings).forEach(([outputName, varName]) => {
            const variable = workflow?.outputs?.find(v => v.name === varName);
            outputValues[varName] = variable?.value;
        });
    }

    if (!actionStep.tool) {
        return <div className="text-gray-500 dark:text-gray-400">No tool selected</div>;
    }

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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Parameter Mappings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Parameter Mappings
                        </h5>
                        <div className="space-y-2">
                            {actionStep.parameter_mappings && Object.entries(actionStep.parameter_mappings).map(([paramName, varName]) => (
                                <div key={paramName} className="space-y-1">
                                    <div className="font-medium text-gray-700 dark:text-gray-300">{paramName}:</div>
                                    <div className="text-gray-600 dark:text-gray-400 font-mono pl-4">{String(varName)}</div>
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
                                <div key={varName} className="space-y-1">
                                    <div className="font-medium text-gray-700 dark:text-gray-300">{varName}:</div>
                                    <div className="pl-4">
                                        {formatValue(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Output Mappings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Output Mappings
                        </h5>
                        <div className="space-y-2">
                            {actionStep.output_mappings && Object.entries(actionStep.output_mappings).map(([outputName, varName]) => (
                                <div key={outputName} className="space-y-1">
                                    <div className="font-medium text-gray-700 dark:text-gray-300">{outputName}:</div>
                                    <div className="text-gray-600 dark:text-gray-400 font-mono pl-4">{String(varName)}</div>
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
                                <div key={varName} className="space-y-1">
                                    <div className="font-medium text-gray-700 dark:text-gray-300">{varName}:</div>
                                    <div className="pl-4">
                                        {formatValue(value)}
                                    </div>
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