import React, { useState } from 'react';
import { Job, StepExecutionResult, JobExecutionState } from '../../types/jobs';
import { useValueFormatter } from '../../hooks/useValueFormatter';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';
import VariableRenderer from '../common/VariableRenderer';

interface JobExecutionHistoryProps {
    job: Job;
    executionState?: JobExecutionState;
}

interface StepResultCardProps {
    job: Job;
    result: StepExecutionResult;
    isExpanded: boolean;
    onToggle: () => void;
    executionIndex: number;
}

// Helper function to safely get a value from outputs
const getOutputValue = (outputs: Record<WorkflowVariableName, SchemaValueType> | undefined, key: string): string => {
    if (!outputs) return '';
    const value = outputs[key as WorkflowVariableName];
    return value !== undefined ? String(value) : '';
};

const StepResultCard: React.FC<StepResultCardProps> = ({ job, result, isExpanded, onToggle, executionIndex }) => {
    const { formatValue } = useValueFormatter();

    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return 'Not started';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Get step definition from job
    const stepIndex = job.steps.findIndex(s => s.step_id === result.step_id);
    const stepDefinition = job.steps[stepIndex] || { step_type: 'UNKNOWN' };

    // Get input mappings and values
    const getInputMappings = () => {
        if (!stepDefinition.parameter_mappings || !stepDefinition.tool) {
            return [];
        }

        return Object.entries(stepDefinition.parameter_mappings).map(([paramName, varName]) => {
            const paramDef = stepDefinition.tool?.signature.parameters.find(p => p.name === paramName);

            // Get the input variable value from the job state
            const varValue = job.state?.find(v => v.name === varName)?.value;

            return {
                paramName,
                varName,
                paramLabel: paramDef?.description || paramName,
                value: varValue
            };
        });
    };

    // Get output mappings and values
    const getOutputMappings = () => {
        if (!stepDefinition.output_mappings || !result.outputs) {
            return [];
        }

        console.log('Step output mappings:', {
            stepDefinition,
            stepId: result.step_id,
            outputs: result.outputs,
            outputMappings: stepDefinition.output_mappings,
        });

        return Object.entries(stepDefinition.output_mappings).map(([outputName, varName]) => {
            // Get output value
            let outputValue;

            outputValue = result.outputs?.[outputName as WorkflowVariableName];

            const outputDef = stepDefinition.tool?.signature.outputs.find(o => o.name === outputName);

            return {
                outputName,
                varName,
                outputLabel: outputDef?.description || outputName,
                value: outputValue,
                schema: outputDef?.schema
            };
        });
    };

    const inputMappings = getInputMappings();
    const outputMappings = getOutputMappings();

    return (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mb-3 flex">
            {/* Sequential Number Badge */}
            <div className="flex items-center justify-center px-3 py-3 bg-gray-100 dark:bg-gray-700 rounded-l border-r border-gray-200 dark:border-gray-600">
                <span className="font-medium text-gray-700 dark:text-gray-200 text-lg">
                    {executionIndex + 1}
                </span>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {/* Header */}
                <button
                    onClick={onToggle}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                            {stepDefinition.label || `Step ${stepIndex + 1}`}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({formatTimestamp(result.started_at)})
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {result.success ? 'Success' : 'Failed'}
                            </span>
                        </div>
                        <svg
                            className={`h-5 w-5 text-gray-400 dark:text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="px-4 pb-4 pt-2 space-y-4">
                        {/* Execution Time */}
                        <div className="flex gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Started: </span>
                                <span className="text-gray-800 dark:text-gray-200">{formatTimestamp(result.started_at)}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Completed: </span>
                                <span className="text-gray-800 dark:text-gray-200">{formatTimestamp(result.completed_at)}</span>
                            </div>
                        </div>

                        {/* Error Message (if any) */}
                        {!result.success && result.error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                <h4 className="text-sm font-medium mb-1 text-red-800 dark:text-red-300">Error</h4>
                                <p className="text-sm text-red-700 dark:text-red-400">{result.error}</p>
                            </div>
                        )}

                        {/* Input Mappings */}
                        {stepDefinition.step_type === 'ACTION' && inputMappings.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-100">Input Mappings</h4>
                                <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                    {inputMappings.map((input, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                <span className="font-medium">{input.paramLabel}</span>
                                                <span className="mx-2 text-gray-400 dark:text-gray-500">←</span>
                                                <span className="text-blue-600 dark:text-blue-400">{input.varName}</span>
                                            </div>
                                            <div className="pl-4">
                                                <VariableRenderer value={input.value} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step Type Specific: Evaluation */}
                        {stepDefinition.step_type === 'EVALUATION' && result.outputs && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-100">Condition Evaluation</h4>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
                                    <div className="text-md font-medium text-gray-700 dark:text-gray-300">
                                        {getOutputValue(result.outputs, 'condition_met') === 'none' ? 'No conditions met' : 'Condition met'}
                                    </div>
                                    {getOutputValue(result.outputs, 'condition_met') !== 'none' && (
                                        <div className="mt-2 space-y-1 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-600 dark:text-gray-400">Variable: </span>
                                                <span className="text-gray-800 dark:text-gray-200">
                                                    Variable: {getOutputValue(result.outputs, 'variable_name')} = {getOutputValue(result.outputs, 'variable_value')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600 dark:text-gray-400">Condition: </span>
                                                <span className="text-gray-800 dark:text-gray-200">
                                                    Condition: {getOutputValue(result.outputs, 'operator')} {getOutputValue(result.outputs, 'comparison_value')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600 dark:text-gray-400">Action: </span>
                                                <span className="text-gray-800 dark:text-gray-200">
                                                    {(() => {
                                                        const action = getOutputValue(result.outputs, 'action').toLowerCase();
                                                        const targetStepIndex = getOutputValue(result.outputs, 'target_step_index');

                                                        if (action === 'jump' && targetStepIndex) {
                                                            const targetStepNumber = parseInt(targetStepIndex) + 1;
                                                            return `Jump to step ${targetStepNumber}`;
                                                        } else if (action === 'end') {
                                                            return 'End workflow';
                                                        } else {
                                                            return 'Continue to next step';
                                                        }
                                                    })()}
                                                </span>
                                            </div>
                                            {getOutputValue(result.outputs, 'reason') && (
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Reason: </span>
                                                    <span className="text-gray-800 dark:text-gray-200">
                                                        Reason: {getOutputValue(result.outputs, 'reason')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Output Mappings */}
                        {stepDefinition.step_type === 'ACTION' && outputMappings.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-100">Output Mappings</h4>
                                <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                    {outputMappings.map((output, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                <span className="font-medium">{output.outputLabel}</span>
                                                <span className="mx-2 text-gray-400 dark:text-gray-500">→</span>
                                                <span className="text-blue-600 dark:text-blue-400">{output.varName}</span>
                                            </div>
                                            <div className="pl-4">
                                                <VariableRenderer value={output.value} schema={output.schema} isMarkdown={true} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Raw Outputs (for debugging or when no mappings exist) */}
                        {result.outputs && Object.keys(result.outputs).length > 0 &&
                            stepDefinition.step_type === 'ACTION' && outputMappings.length === 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-100">Raw Output</h4>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
                                        <VariableRenderer value={result.outputs} />
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const JobExecutionHistory: React.FC<JobExecutionHistoryProps> = ({ job, executionState }) => {
    const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

    const toggleResult = (index: number) => {
        const newExpanded = new Set(expandedResults);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedResults(newExpanded);
    };

    // Get step results from executionState if available, otherwise try to build from job steps
    let stepResults: StepExecutionResult[] = [];

    if (executionState?.step_results && executionState.step_results.length > 0) {
        // Use execution state if available
        stepResults = executionState.step_results;
    } else {
        // Fall back to job step execution history
        stepResults = job.steps
            .filter(step => step.latest_execution)
            .map(step => step.latest_execution!)
            .filter(execution => execution !== undefined);
    }

    // Show message if no execution history is available
    if (stepResults.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No execution history available
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Step Results List */}
            {stepResults.map((result, index) => (
                <StepResultCard
                    key={`${result.step_id}-${index}`}
                    job={job}
                    result={result}
                    isExpanded={expandedResults.has(index)}
                    onToggle={() => toggleResult(index)}
                    executionIndex={index}
                />
            ))}

            {/* Job Error */}
            {job.error_message && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                        Job Error
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 