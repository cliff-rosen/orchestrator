import React, { useState } from 'react';
import { Job, JobStatus, StepExecutionResult } from '../../types/jobs';
import { useJobs } from '../../context/JobsContext';
import { useValueFormatter } from '../../hooks/useValueFormatter';
import { Box, Typography, List, ListItem, ListItemText, Divider, Chip, Paper, Grid } from '@mui/material';
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
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${isExpanded ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${result.success
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                        {executionIndex + 1}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {stepDefinition.label || `Step ${stepIndex + 1}`}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(result.started_at)}
                                {result.completed_at && ` - ${formatTimestamp(result.completed_at)}`}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {stepDefinition.step_type === 'EVALUATION' ? 'Evaluation Step' : stepDefinition.tool?.name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex items-center gap-2">
                    {result.success ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-600/20 dark:ring-green-300/20">
                            Success
                        </span>
                    ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-1 ring-rose-600/20 dark:ring-rose-300/20">
                            Failed
                        </span>
                    )}
                    <svg
                        className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    {/* Error Message */}
                    {result.error && (
                        <div className="bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900 rounded-lg p-3">
                            <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-1">
                                Error
                            </h4>
                            <p className="text-sm text-rose-600 dark:text-rose-300">
                                {result.error}
                            </p>
                        </div>
                    )}

                    {/* Step Information */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Execution Details
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Execution #{executionIndex + 1} of Step {stepIndex + 1} ({stepDefinition.label})
                        </p>
                    </div>

                    {/* Input Parameters */}
                    {stepDefinition.step_type === 'ACTION' && inputMappings.length > 0 && (
                        <Paper elevation={0} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500, color: 'text.secondary', mb: 2 }}>
                                Input Parameters
                            </Typography>
                            <Grid container spacing={2}>
                                {inputMappings.map((input, idx) => (
                                    <Grid item xs={12} key={idx}>
                                        <Box className="bg-gray-50 dark:bg-gray-800/70 p-2 rounded">
                                            <Box className="flex flex-wrap items-center gap-2 mb-1">
                                                <Chip
                                                    label={input.paramLabel}
                                                    size="small"
                                                    className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                />
                                                <span className="text-gray-400">←</span>
                                                <Chip
                                                    label={String(input.varName)}
                                                    size="small"
                                                    className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                />
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', pl: 2 }}>
                                                {formatValue(input.value)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}

                    {/* Evaluation Step Details */}
                    {stepDefinition.step_type === 'EVALUATION' && result.outputs && (
                        <Paper elevation={0} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500, color: 'text.secondary', mb: 2 }}>
                                Evaluation Result
                            </Typography>
                            <Box className="bg-gray-50 dark:bg-gray-800/70 p-3 rounded">
                                <Typography sx={{ color: 'text.secondary' }}>
                                    {getOutputValue(result.outputs, 'condition_met') === 'none' ? 'No conditions met' : 'Condition met'}
                                </Typography>
                                {getOutputValue(result.outputs, 'condition_met') !== 'none' && (
                                    <>
                                        <Divider className="my-2" />
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 1 }}>
                                            Condition Details
                                        </Typography>
                                        <Box className="pl-2 mb-2">
                                            <Typography sx={{ color: 'text.secondary' }}>
                                                <Chip
                                                    label={getOutputValue(result.outputs, 'variable_name')}
                                                    size="small"
                                                    className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mr-2"
                                                />
                                                = {getOutputValue(result.outputs, 'variable_value')}
                                            </Typography>
                                            <Typography sx={{ color: 'text.secondary' }}>
                                                {getOutputValue(result.outputs, 'operator')} {getOutputValue(result.outputs, 'comparison_value')}
                                            </Typography>
                                        </Box>
                                        <Divider className="my-2" />
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 1 }}>
                                            Action
                                        </Typography>
                                        <Box className="pl-2">
                                            <Typography sx={{ color: 'text.secondary' }}>
                                                {getOutputValue(result.outputs, 'action') === 'jump'
                                                    ? `Jump to step ${parseInt(getOutputValue(result.outputs, 'target_step_index')) + 1}`
                                                    : getOutputValue(result.outputs, 'action') === 'end'
                                                        ? 'End workflow'
                                                        : 'Continue to next step'
                                                }
                                            </Typography>
                                            {getOutputValue(result.outputs, 'reason') && (
                                                <Typography sx={{ color: 'text.secondary', mt: 1 }}>
                                                    Reason: {getOutputValue(result.outputs, 'reason')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Paper>
                    )}

                    {/* Tool Outputs */}
                    {stepDefinition.step_type === 'ACTION' && outputMappings.length > 0 && (
                        <Paper elevation={0} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500, color: 'text.secondary', mb: 2 }}>
                                Output Mappings
                            </Typography>
                            <Grid container spacing={2}>
                                {outputMappings.map((output, idx) => (
                                    <Grid item xs={12} key={idx}>
                                        <Box className="bg-gray-50 dark:bg-gray-800/70 p-2 rounded">
                                            <Box className="flex flex-wrap items-center gap-2 mb-1">
                                                <Chip
                                                    label={output.outputLabel}
                                                    size="small"
                                                    className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                />
                                                <span className="text-gray-400">→</span>
                                                <Chip
                                                    label={String(output.varName)}
                                                    size="small"
                                                    className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                />
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', pl: 2 }}>
                                                {formatValue(output.value)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}

                    {/* Raw Outputs (for debugging or when no mappings exist) */}
                    {stepDefinition.step_type === 'ACTION' && hasOutputs && outputMappings.length === 0 && (
                        <Paper elevation={0} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500, color: 'text.secondary', mb: 2 }}>
                                Raw Outputs
                            </Typography>
                            <List>
                                {Object.entries(result.outputs || {}).map(([key, value]) => (
                                    <ListItem key={key}>
                                        <ListItemText
                                            primary={key}
                                            secondary={formatValue(value)}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
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
                <div className="mt-4 border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-lg p-4">
                    <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                        Job Error
                    </h4>
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 