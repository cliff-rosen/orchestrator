import React, { useState } from 'react';
import { Job, StepExecutionResult, JobExecutionState, JobStatus } from '../../types/jobs';
import { useValueFormatter } from '../../hooks/useValueFormatter';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';
import VariableRenderer from '../common/VariableRenderer';
import { usePromptTemplates } from '../../context/PromptTemplateContext';

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
    const { templates } = usePromptTemplates();

    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return 'Not started';
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Calculate duration if both timestamps exist
    const getDuration = () => {
        if (!result.started_at || !result.completed_at) return null;
        const start = new Date(result.started_at).getTime();
        const end = new Date(result.completed_at).getTime();
        const durationMs = end - start;

        if (durationMs < 1000) {
            return `${durationMs}ms`;
        } else if (durationMs < 60000) {
            return `${(durationMs / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    };

    // Get step definition from job
    const stepIndex = job.steps.findIndex(s => s.step_id === result.step_id);
    const stepDefinition = job.steps[stepIndex] || { step_type: 'UNKNOWN' };

    // Get template name if this is an LLM tool
    const getTemplateName = () => {
        if (stepDefinition.tool?.tool_type === 'llm' && stepDefinition.prompt_template_id) {
            const template = templates.find(t => t.template_id === stepDefinition.prompt_template_id);
            return template?.name || stepDefinition.prompt_template_id;
        }
        return null;
    };

    // Get step type display text
    const getStepTypeDisplay = () => {
        if (stepDefinition.step_type === 'EVALUATION') {
            return 'Evaluation';
        } else if (stepDefinition.step_type === 'ACTION') {
            return 'Tool';
        } else {
            return stepDefinition.step_type;
        }
    };

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
    const duration = getDuration();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                        {executionIndex + 1}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {stepDefinition.label || `Step ${stepIndex + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{formatTimestamp(result.started_at)}</span>
                            {duration && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span>{duration}</span>
                                </>
                            )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <span className="font-medium">{getStepTypeDisplay()}</span>
                            {stepDefinition.step_type === 'ACTION' && stepDefinition.tool && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span>{stepDefinition.tool.name}</span>
                                    {stepDefinition.tool.tool_type === 'llm' && getTemplateName() && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                            <span>Template: {getTemplateName()}</span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${result.success
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {result.success ? 'Success' : 'Failed'}
                    </span>
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
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                    {/* Error Message (if any) */}
                    {!result.success && result.error && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Error</h4>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md p-3">
                                <div className="grid grid-cols-3 gap-x-4">
                                    <div className="text-sm font-medium text-red-700 dark:text-red-300">Message</div>
                                    <div className="col-span-2 text-sm text-red-700 dark:text-red-400">
                                        {result.error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Type Specific: Evaluation */}
                    {stepDefinition.step_type === 'EVALUATION' && result.outputs && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Condition Evaluation</h4>
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                                {getOutputValue(result.outputs, 'condition_met') === 'none' ? (
                                    <div className="text-gray-700 dark:text-gray-300">No conditions met</div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Variable</div>
                                        <div className="col-span-2 text-gray-700 dark:text-gray-300">
                                            {getOutputValue(result.outputs, 'variable_name')} = {getOutputValue(result.outputs, 'variable_value')}
                                        </div>

                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition</div>
                                        <div className="col-span-2 text-gray-700 dark:text-gray-300">
                                            {getOutputValue(result.outputs, 'operator')} {getOutputValue(result.outputs, 'comparison_value')}
                                        </div>

                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Action</div>
                                        <div className="col-span-2 text-gray-700 dark:text-gray-300">
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
                                        </div>

                                        {getOutputValue(result.outputs, 'reason') && (
                                            <>
                                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason</div>
                                                <div className="col-span-2 text-gray-700 dark:text-gray-300">
                                                    {getOutputValue(result.outputs, 'reason')}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Input/Output Mappings */}
                    {stepDefinition.step_type === 'ACTION' && (
                        <div>
                            {/* Input Mappings */}
                            {inputMappings.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Inputs</h4>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                                        {inputMappings.map((input, idx) => (
                                            <React.Fragment key={idx}>
                                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {input.paramLabel}
                                                </div>
                                                <div className="col-span-2">
                                                    <VariableRenderer value={input.value} />
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Output Mappings */}
                            {outputMappings.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Outputs</h4>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                                        {outputMappings.map((output, idx) => (
                                            <React.Fragment key={idx}>
                                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {output.outputLabel}
                                                </div>
                                                <div className="col-span-2">
                                                    <VariableRenderer value={output.value} schema={output.schema} isMarkdown={true} />
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
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
        <div className="space-y-3">
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
                <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Job Error</h4>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-lg p-3">
                        <div className="grid grid-cols-3 gap-x-4">
                            <div className="text-sm font-medium text-red-700 dark:text-red-300">Message</div>
                            <div className="col-span-2 text-sm text-red-700 dark:text-red-300">
                                {job.error_message}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 