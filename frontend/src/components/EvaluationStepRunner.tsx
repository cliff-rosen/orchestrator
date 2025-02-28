import React from 'react';
import { WorkflowStep, EvaluationResult } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';

interface EvaluationStepRunnerProps {
    step: WorkflowStep;
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

    // Get evaluation results from workflow state
    const evaluationResultVar = workflow?.state?.find(
        v => v.name === `eval_${step.step_id.slice(0, 8)}`
    );
    const evaluationResult = evaluationResultVar?.value as EvaluationResult | undefined;

    // If we don't have an evaluation config, show an error
    if (!step.evaluation_config) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <h2 className="text-lg font-semibold mb-2">Error</h2>
                <p>This evaluation step is missing its configuration. Please edit this step to set up conditions.</p>
            </div>
        );
    }

    // Render the evaluation step
    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                    <span className="mr-2">⚖️</span>
                    Evaluation Step
                </h2>
                <p className="mb-2 text-blue-600 dark:text-blue-400">
                    This step evaluates conditions and determines which path to take in the workflow.
                </p>
                {isExecuted && evaluationResult && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                        <h3 className="font-medium mb-1 text-blue-600 dark:text-blue-400">Evaluation Result</h3>
                        <p>{evaluationResult.reason || 'Evaluation complete'}</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {step.evaluation_config.conditions.map((condition, index) => {
                    console.log('**************************************');
                    console.log('evaluationResult outputs', evaluationResult?.outputs);
                    console.log('condition', condition.condition_id);
                    console.log('**************************************');
                    const variableValue = availableVariables.find(v => v.name === condition.variable)?.value;

                    // Access condition_met as a string key
                    const conditionMet = evaluationResult?.outputs ? evaluationResult.outputs['condition_met' as any] : undefined;
                    const isConditionMet = conditionMet === condition.condition_id;

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
                                {(evaluationResult.outputs as Record<string, string>)?.condition_met === 'none' ? 'No conditions met' : 'Condition met'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Next Action:</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                {evaluationResult.next_action === 'jump' ? 'Jump to step' : 'Continue'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Target Step:</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                {evaluationResult.target_step_index !== undefined ? `Step ${evaluationResult.target_step_index + 1}` : 'Next step'}
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
    );
};

export default EvaluationStepRunner; 