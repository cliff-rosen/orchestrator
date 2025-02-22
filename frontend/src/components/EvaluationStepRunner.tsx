import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';

interface EvaluationStepRunnerProps {
    step: RuntimeWorkflowStep;
    isExecuted: boolean;
    isExecuting: boolean;
}

const EvaluationStepRunner: React.FC<EvaluationStepRunnerProps> = ({
    step,
    isExecuted,
    isExecuting
}) => {
    const { workflow } = useWorkflows();

    // Get all available variables for condition evaluation
    const availableVariables = [
        ...(workflow?.inputs || []),
        ...(workflow?.outputs || []),
        // Add variables from previous steps
        ...workflow?.steps
            .filter(s => s.sequence_number < step.sequence_number)
            .flatMap(s => Object.entries(s.output_mappings || {})
                .map(([_, varName]) => ({
                    name: varName,
                    description: `Output from step ${s.label}`
                }))
            ) || []
    ];

    if (!step.evaluation_config) {
        return (
            <div className="text-red-500">
                Error: No evaluation configuration found for this step.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Evaluation Conditions
                </h3>

                {/* Display conditions */}
                <div className="space-y-4">
                    {step.evaluation_config.conditions.map((condition, index) => (
                        <div key={index} className="border dark:border-gray-700 rounded-lg p-4">
                            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {condition.variable}
                                </div>
                                <div className="text-gray-500 dark:text-gray-500">
                                    {condition.operator}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {condition.value}
                                </div>
                                <div className="text-gray-500 dark:text-gray-500">
                                    →
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {condition.target_step_index !== undefined
                                        ? `Jump to step ${condition.target_step_index + 1}`
                                        : 'Continue to next step'
                                    }
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Display default action */}
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Default Action:
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {step.evaluation_config.default_action === 'continue'
                                ? 'Continue to next step'
                                : 'End workflow'
                            }
                        </span>
                    </div>
                </div>

                {/* Execution status */}
                {isExecuting && (
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                        Evaluating conditions...
                    </div>
                )}
                {isExecuted && (
                    <div className="mt-4 text-green-600 dark:text-green-400">
                        Evaluation complete
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationStepRunner; 