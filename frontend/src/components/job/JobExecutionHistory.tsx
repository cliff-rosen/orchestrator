import React, { useState } from 'react';
import { Job, JobStatus, StepExecutionResult } from '../../types/jobs';
import { useJobs } from '../../context/JobsContext';
import { useValueFormatter } from '../../hooks/useValueFormatter';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';

interface JobExecutionHistoryProps {
    job: Job;
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
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Find the corresponding step definition from the job
    const stepDefinition = job.steps.find(step => step.step_id === result.step_id);

    if (!stepDefinition) {
        return null; // Skip if step definition not found
    }

    const hasOutputs = result.outputs && Object.keys(result.outputs).length > 0;
    const stepIndex = job.steps.findIndex(s => s.step_id === result.step_id);

    // Get input mappings and values
    const getInputMappings = () => {
        if (!stepDefinition.parameter_mappings || !stepDefinition.tool) {
            return [];
        }

        return Object.entries(stepDefinition.parameter_mappings).map(([paramName, varName]) => {
            // Find the variable in job state
            const stateVar = job.state.find(v => v.name === varName);
            const paramDef = stepDefinition.tool?.signature.parameters.find(p => p.name === paramName);

            return {
                paramName,
                varName,
                paramLabel: paramDef?.description || paramName,
                value: stateVar?.value
            };
        });
    };

    // Get output mappings and values
    const getOutputMappings = () => {
        if (!stepDefinition.output_mappings || !result.outputs) {
            return [];
        }

        return Object.entries(stepDefinition.output_mappings).map(([outputName, varName]) => {
            // Find the output in result outputs
            const outputValue = result.outputs ? result.outputs[varName] : undefined;
            const outputDef = stepDefinition.tool?.signature.outputs.find(o => o.name === outputName);

            return {
                outputName,
                varName,
                outputLabel: outputDef?.description || outputName,
                value: outputValue
            };
        });
    };

    const inputMappings = getInputMappings();
    const outputMappings = getOutputMappings();

    return (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mb-3">
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
                    <span className="text-xs ml-2">
                        {stepDefinition.step_type === 'EVALUATION' ? 'Evaluation Step' : stepDefinition.tool?.name}
                    </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${result.success
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {result.success ? 'Success' : 'Failed'}
                    </span>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Details Panel */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {/* Error Message */}
                    {result.error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded">
                            <h4 className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                                Error
                            </h4>
                            <p className="text-sm text-red-800 dark:text-red-300">
                                {result.error}
                            </p>
                        </div>
                    )}

                    {/* Input Parameters */}
                    {stepDefinition.step_type === 'ACTION' && inputMappings.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Input Parameters</h4>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-2">Parameter</th>
                                        <th className="text-left p-2">Variable</th>
                                        <th className="text-left p-2">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inputMappings.map((input, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="p-2">{input.paramLabel}</td>
                                            <td className="p-2">{String(input.varName)}</td>
                                            <td className="p-2">{String(input.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Evaluation Step Details */}
                    {stepDefinition.step_type === 'EVALUATION' && result.outputs && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Evaluation Result</h4>
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                <p className="mb-2">
                                    {getOutputValue(result.outputs, 'condition_met') === 'none' ? 'No conditions met' : 'Condition met'}
                                </p>
                                {getOutputValue(result.outputs, 'condition_met') !== 'none' && (
                                    <>
                                        <Divider className="my-2" />
                                        <h5 className="text-sm font-medium mb-1">Condition Details</h5>
                                        <p className="ml-2 mb-1">
                                            Variable: {getOutputValue(result.outputs, 'variable_name')} = {getOutputValue(result.outputs, 'variable_value')}
                                        </p>
                                        <p className="ml-2 mb-2">
                                            Condition: {getOutputValue(result.outputs, 'operator')} {getOutputValue(result.outputs, 'comparison_value')}
                                        </p>
                                        <h5 className="text-sm font-medium mb-1">Action</h5>
                                        <p className="ml-2">
                                            {getOutputValue(result.outputs, 'action') === 'jump'
                                                ? `Jump to step ${parseInt(getOutputValue(result.outputs, 'target_step_index')) + 1}`
                                                : getOutputValue(result.outputs, 'action') === 'end'
                                                    ? 'End workflow'
                                                    : 'Continue to next step'
                                            }
                                        </p>
                                        {getOutputValue(result.outputs, 'reason') && (
                                            <p className="ml-2 mt-1">
                                                Reason: {getOutputValue(result.outputs, 'reason')}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tool Outputs */}
                    {stepDefinition.step_type === 'ACTION' && outputMappings.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Output Mappings</h4>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-2">Tool Output</th>
                                        <th className="text-left p-2">Variable</th>
                                        <th className="text-left p-2">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outputMappings.map((output, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="p-2">{output.outputLabel}</td>
                                            <td className="p-2">{String(output.varName)}</td>
                                            <td className="p-2">{String(output.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Raw Outputs (for debugging or when no mappings exist) */}
                    {stepDefinition.step_type === 'ACTION' && hasOutputs && outputMappings.length === 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Raw Outputs</h4>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-2">Name</th>
                                        <th className="text-left p-2">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(result.outputs || {}).map(([key, value], idx) => (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="p-2">{key}</td>
                                            <td className="p-2">{String(value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const JobExecutionHistory: React.FC<JobExecutionHistoryProps> = ({ job }) => {
    const { executionState } = useJobs();
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

    // Use step_results from executionState if available, otherwise show a message
    if (!executionState || !executionState.step_results || executionState.step_results.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No execution history available
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Step Results List */}
            {executionState.step_results.map((result, index) => (
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