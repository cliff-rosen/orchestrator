import React from 'react';
import { Link } from 'react-router-dom';
import { Job, JobStatus } from '../../types/jobs';
import { Workflow } from '../../types/workflows';
import { useValueFormatter } from '../../hooks/useValueFormatter.tsx';
import { WorkflowInputs } from './WorkflowInputs';
import { WorkflowOutputs } from './WorkflowOutputs';
import { useJobs } from '../../context/JobsContext';

interface JobLiveOutputProps {
    job: Job;
    workflow: Workflow;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job, workflow }) => {
    const { executionState } = useJobs();
    const isComplete = job.status === JobStatus.COMPLETED;
    const isFailed = job.status === JobStatus.FAILED;
    const { formatValue } = useValueFormatter();

    // For completed jobs, show final outputs
    if (isComplete) {
        // Get the final step's output
        const finalStep = job.steps[job.steps.length - 1];
        const finalStepOutput = finalStep?.output_data || {};

        // Get outputs from other steps
        const otherOutputs = job.steps
            .slice(0, -1)
            .map(step => ({
                step_type: step.step_type,
                label: step.label || `Step ${job.steps.findIndex(s => s.step_id === step.step_id) + 1}`,
                output_data: step.output_data || {}
            }))
            .filter(output => Object.keys(output.output_data).length > 0);

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

    return (
        <div className="space-y-4">
            {/* Current Step Info */}
            <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {currentStep.tool?.name || 'Current Step'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full 
                        ${currentStep.status === JobStatus.RUNNING
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : currentStep.status === JobStatus.FAILED
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {currentStep.status}
                    </span>
                </div>

                {/* Tool Description */}
                {currentStep.tool?.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {currentStep.tool.description}
                    </p>
                )}

                {/* Current Step Parameters */}
                {currentStep.parameter_mappings && Object.keys(currentStep.parameter_mappings).length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Input Parameters
                        </h4>
                        <div className="space-y-1">
                            {Object.entries(currentStep.parameter_mappings).map(([key, mapping]) => {
                                console.log('mapping', key, mapping);
                                // First check input variables
                                const inputVar = job.input_variables?.find(v => v.name === mapping);
                                let value = inputVar?.value;

                                // If not found in inputs, check job outputs
                                if (value === undefined && job.output_data && mapping in job.output_data) {
                                    value = job.output_data[mapping];
                                }

                                // If still not found, use mapping as literal value
                                if (value === undefined) {
                                    value = mapping;
                                }

                                return (
                                    <div key={key} className="text-sm">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                        <span className="text-gray-400 dark:text-gray-500"> = </span>
                                        <span className="text-gray-700 dark:text-gray-100">
                                            {formatValue(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Live Output */}
                <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Live Output Area
                </h4>
                {executionState?.job_id === job.job_id && executionState.live_output && (
                    <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded p-3">
                        <div className="h-[200px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {executionState.live_output}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {currentStep.status === JobStatus.FAILED && currentStep.error_message && (
                    <div className="mt-4 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded p-3">
                        <div className="max-h-[200px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                            <pre className="text-sm whitespace-pre-wrap">
                                {currentStep.error_message}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 