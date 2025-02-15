// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';

interface ActionStepRunnerProps {
    actionStep: RuntimeWorkflowStep;
    isExecuted: boolean;
}

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    isExecuted
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

    // Helper function to format values for display
    const formatValue = (value: any) => {
        if (value === undefined || value === null) {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        if (Array.isArray(value)) {
            return (
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <div className="p-3">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span className="text-xs">Array ({value.length} items)</span>
                        </div>
                        <div className="space-y-1">
                            {value.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 select-none">{index}</span>
                                    <div className="flex-1 text-gray-700 dark:text-gray-300 text-sm">
                                        {typeof item === 'object' ? (
                                            <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                                        ) : (
                                            <span className="break-all">{String(item)}</span>
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
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <pre className="p-3 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 text-gray-700 dark:text-gray-300 text-sm break-all">
                    {String(value)}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stage Indicator */}
            <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${isExecuted ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                        ${isExecuted ? 'border-gray-300 dark:border-gray-600' : 'border-blue-600 dark:border-blue-400'}`}>
                        1
                    </div>
                    <span className="ml-2">Preparation</span>
                </div>
                <div className={`flex-grow h-0.5 ${isExecuted ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                <div className={`flex items-center ${isExecuted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                        ${isExecuted ? 'border-blue-600 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}>
                        2
                    </div>
                    <span className="ml-2">Results</span>
                </div>
            </div>

            {/* Tool Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {actionStep.tool.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {actionStep.tool.description}
                    </p>
                </div>

                {/* Parameters Section */}
                <div className="mt-6 space-y-4">
                    <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Input Parameters</h4>
                        {!isExecuted && (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded">
                                Ready to Execute
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
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
                                    <tr key={paramName} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
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
                <div className="mt-8 space-y-4">
                    <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h4>
                        {isExecuted && (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded">
                                Execution Complete
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
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
                                    <tr key={outputName} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
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

            {/* Execution State Description */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {!isExecuted ? (
                    <p>This step is ready to be executed</p>
                ) : (
                    <p>This step has been executed and produced results</p>
                )}
            </div>
        </div>
    );
};

export default ActionStepRunner; 