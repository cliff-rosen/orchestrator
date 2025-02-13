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
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm">
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Array ({value.length} items)</span>
                    </div>
                    <div className="space-y-1">
                        {value.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded">
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 select-none">{index}</span>
                                <div className="flex-1">
                                    {typeof item === 'object' ? (
                                        <div className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</div>
                                    ) : (
                                        <div className="break-all">{String(item)}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div className="p-3 text-gray-600 dark:text-gray-300 font-mono text-sm whitespace-pre-wrap">
                {String(value)}
            </div>
        </div>
    );
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
            inputValues[paramName] = variable?.value;
        });
    }

    // Get output values from workflow variables
    const outputValues: Record<string, any> = {};
    if (actionStep.output_mappings) {
        Object.entries(actionStep.output_mappings).forEach(([outputName, varName]) => {
            const variable = workflow?.outputs?.find(v => v.name === varName);
            outputValues[outputName] = variable?.value;
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
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Inputs</h4>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Workflow Variable
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Tool Parameter
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {actionStep.parameter_mappings && Object.entries(actionStep.parameter_mappings).map(([paramName, varName]) => (
                                <tr key={paramName}>
                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                        {varName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                        {paramName}
                                    </td>
                                    <td className="px-4 py-2">
                                        {formatValue(inputValues[paramName])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h4>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Tool Output
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Workflow Variable
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {actionStep.output_mappings && Object.entries(actionStep.output_mappings).map(([outputName, varName]) => (
                                <tr key={outputName}>
                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                        {outputName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                        {varName}
                                    </td>
                                    <td className="px-4 py-2">
                                        {formatValue(outputValues[outputName])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActionStepRunner; 