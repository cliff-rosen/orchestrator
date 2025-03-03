import React from 'react';
import { Link } from 'react-router-dom';
import { Job, JobStatus, JobStep } from '../../types/jobs';
import { Workflow } from '../../types/workflows';
import { useValueFormatter } from '../../hooks/useValueFormatter.tsx';
import { WorkflowInputs } from './WorkflowInputs';
import { WorkflowOutputs } from './WorkflowOutputs';
import { useJobs } from '../../context/JobsContext';
import { Box, Typography } from '@mui/material';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';
import { ToolOutputName } from '../../types/tools';

interface JobLiveOutputProps {
    job: Job;
    workflow: Workflow;
    step: JobStep;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job, workflow, step }) => {
    const { executionState } = useJobs();
    const isComplete = job.status === JobStatus.COMPLETED;
    const isFailed = job.status === JobStatus.FAILED;
    const { formatValue } = useValueFormatter();

    // For completed jobs, show final outputs
    if (isComplete) {
        // Get the final step's outputs
        const finalStep = job.steps[job.steps.length - 1];
        const finalStepOutput = finalStep?.latest_execution?.outputs || {};

        // Get all steps that have outputs
        const stepsWithOutputs = job.steps
            .map((step, index) => ({
                index,
                step,
                outputs: step.latest_execution?.outputs || {}
            }))
            .filter(output => Object.keys(output.outputs).length > 0);

        // If there are no outputs, don't render anything
        if (stepsWithOutputs.length === 0) {
            return null;
        }

        // Convert stepsWithOutputs to the format expected by WorkflowOutputs
        const otherOutputs = stepsWithOutputs.map(({ step, outputs, index }) => ({
            step_type: step.step_type,
            label: step.label || `Step ${index + 1}`,
            outputs: outputs as Record<string, SchemaValueType>
        }));

        return (
            <div className="space-y-6">
                {/* Job Summary Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                            Job Summary
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {workflow ? (
                                <>
                                    Running{' '}
                                    <Link
                                        to={`/workflow/${workflow.workflow_id}`}
                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                    >
                                        {workflow.name}
                                    </Link>
                                </>
                            ) : (
                                'Workflow execution completed successfully'
                            )}
                        </p>
                    </div>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-600/20 dark:ring-green-300/20">
                        Completed
                    </span>
                </div>

                {/* Workflow Inputs */}
                {job.input_variables && <WorkflowInputs inputs={job.input_variables} />}

                {/* Workflow Outputs */}
                <WorkflowOutputs finalStepOutput={finalStepOutput} otherOutputs={otherOutputs} />
            </div>
        );
    }

    // For running or failed jobs, show current step info using executionState if available
    const currentStepIndex = executionState?.job_id === job.job_id
        ? executionState.current_step_index
        : job.execution_progress?.current_step || 0;

    const currentStep = job.steps[currentStepIndex];

    if (!currentStep) return null;

    // Get the final step's outputs
    const finalStep = job.steps[job.steps.length - 1];
    const finalStepOutput = finalStep?.latest_execution?.outputs || {};

    // Get all steps that have outputs
    const stepsWithOutputs = job.steps
        .map((step, index) => ({
            index,
            step,
            outputs: step.latest_execution?.outputs || {}
        }))
        .filter(output => Object.keys(output.outputs).length > 0);

    // If there are no outputs, don't render anything
    if (stepsWithOutputs.length === 0) {
        return null;
    }

    // Convert stepsWithOutputs to the format expected by WorkflowOutputs
    const otherOutputs = stepsWithOutputs.map(({ step, outputs, index }) => ({
        step_type: step.step_type,
        label: step.label || `Step ${index + 1}`,
        outputs: outputs as Record<string, SchemaValueType>
    }));

    return (
        <Box>
            <WorkflowOutputs finalStepOutput={finalStepOutput} otherOutputs={otherOutputs} />

            {stepsWithOutputs.map(({ index, step, outputs }) => (
                <Box key={index} className="mb-4">
                    <Typography variant="subtitle2">
                        Step {index + 1} Outputs
                    </Typography>
                    {Object.entries(outputs).map(([key, value]) => {
                        // Check if this output is mapped to a workflow variable
                        let mappedVariable: string | undefined;
                        let mappedValue: any;

                        if (step.output_mappings && key in step.output_mappings) {
                            const outputKey = key as ToolOutputName;
                            mappedVariable = step.output_mappings[outputKey];
                            // Try to find the value in the job state
                            const stateVar = job.state.find(v => v.name === mappedVariable);
                            if (stateVar) {
                                mappedValue = stateVar.value;
                            }
                        }

                        return (
                            <Box key={key} className="mb-2">
                                <div>
                                    {key}: {formatValue(value)}
                                </div>
                                {mappedVariable && (
                                    <div className="text-gray-500">
                                        Mapped to: {mappedVariable} = {formatValue(mappedValue)}
                                    </div>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            ))}
        </Box>
    );
}; 