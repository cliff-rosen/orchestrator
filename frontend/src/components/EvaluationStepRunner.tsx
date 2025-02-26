import React from 'react';
import { RuntimeWorkflowStep, EvaluationResult } from '../types/workflows';
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
        ...(workflow?.state || [])
    ];

    // Get the evaluation result if executed
    const evaluationResult = React.useMemo(() => {
        if (!isExecuted || !workflow?.state) return null;
        // Use the new shorter format for evaluation result variables
        const shortStepId = step.step_id.slice(0, 8);
        return workflow.state.find(o => o.name === `${shortStepId}_eval`)?.value as EvaluationResult | undefined;
    }, [isExecuted, workflow?.state, step.step_id]);

    if (!step.evaluation_config) {
        return (
            <div className="text-red-500">
                Error: No evaluation configuration found for this step.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Conditions Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Evaluation Conditions
                </h3>

                {/* Display conditions */}
                <div className="space-y-4">
                    {step.evaluation_config.conditions.map((condition, index) => {
                        const variableValue = availableVariables.find(v => v.name === condition.variable)?.value;
                        const isConditionMet = evaluationResult?.condition_met === condition.condition_id;

                        return (
                            <div
                                key={index}
                                className={`border rounded-lg p-4 transition-colors ${isExecuted ? (
                                    isConditionMet
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                ) : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center">
                                    <div className="text-sm">
                                        <div className="font-medium text-gray-700 dark:text-gray-300">
                                            {condition.variable}
                                        </div>
                                        {isExecuted && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Current value: {variableValue !== undefined ? String(variableValue) : 'undefined'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                                        {condition.operator}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {condition.value}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        →
                                    </div>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {condition.target_step_index !== undefined
                                            ? `Jump to step ${condition.target_step_index + 1}`
                                            : 'Next step'
                                        }
                                    </div>
                                </div>
                                {isExecuted && isConditionMet && (
                                    <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Condition met
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Execution status */}
                {isExecuting && (
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                        Evaluating conditions...
                    </div>
                )}

                {isExecuted && evaluationResult && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Evaluation Result
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Result:</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {evaluationResult.condition_met === 'none' ? 'No conditions met' : 'Condition met'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Next Action:</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {evaluationResult.action === 'jump' ? 'Jump to step' : 'Continue'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Target Step:</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {evaluationResult.target_step_index ? `Step ${parseInt(evaluationResult.target_step_index) + 1}` : 'Next step'}
                                </span>
                            </div>
                            {evaluationResult.reason && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Reason:</span>
                                    <span className="text-gray-900 dark:text-gray-100">{evaluationResult.reason}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationStepRunner; 