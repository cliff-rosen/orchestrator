import React from 'react';
import { Link } from 'react-router-dom';
import { Job, JobStatus, JobStep, JobExecutionState } from '../../types/jobs';
import { Workflow } from '../../types/workflows';
import { WorkflowInputs } from './WorkflowInputs';
import { WorkflowOutputs } from './WorkflowOutputs';
import { SchemaValueType } from '../../types/schema';
import { JobEngine } from '../../lib/job/jobEngine';

interface JobLiveOutputProps {
    job: Job;
    workflow: Workflow;
    step?: JobStep;
    executionState?: JobExecutionState;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job, workflow, step, executionState }) => {

    // Get input variables using JobEngine
    const inputVariables = JobEngine.getInputVariables(job);

    // Get steps with outputs
    const stepsWithOutputs = job.steps
        .map((step, index) => ({
            index,
            step,
            outputs: step.latest_execution?.outputs || {}
        }))
        .filter(output => Object.keys(output.outputs).length > 0);

    // Format outputs for WorkflowOutputs component
    const formattedOutputs = stepsWithOutputs.map(({ step, outputs, index }) => ({
        step_type: step.step_type,
        label: step.label || `Step ${index + 1}`,
        outputs: outputs as Record<string, SchemaValueType>
    }));

    // Get final step output
    const finalStepOutput = formattedOutputs[formattedOutputs.length - 1]?.outputs || {};
    const otherOutputs = formattedOutputs.slice(0, -1);

    // Get current step information
    const currentStepIndex = job.execution_progress?.current_step || 0;
    const currentStep = currentStepIndex < job.steps.length ? job.steps[currentStepIndex] : undefined;

    return (
        <div className="space-y-6 min-h-[400px]">
            {/* Live Execution Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                        Current Execution
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
                            'Workflow execution in progress'
                        )}
                    </p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${job.status === JobStatus.RUNNING
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20 dark:ring-blue-300/20'
                    : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 ring-1 ring-gray-600/20 dark:ring-gray-300/20'
                    }`}>
                    {job.status}
                </span>
            </div>

            {/* Current Step Information - Fixed height container */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-64 flex flex-col">
                {/* Step Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {currentStep ? (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {currentStep.label || `Step ${currentStepIndex + 1}`}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStep.status === JobStatus.RUNNING
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : currentStep.status === JobStatus.COMPLETED
                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                    }`}>
                                    {currentStep.status}
                                </span>
                            </div>
                            {currentStep.description && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {currentStep.description}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                            No active step information available
                        </p>
                    )}
                </div>

                {/* Live Output - Flex grow to fill remaining space */}
                <div className="p-4 flex-grow flex flex-col">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Live Output
                    </h4>
                    <div className="flex-grow overflow-auto">
                        {executionState?.live_output ? (
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm h-full">
                                <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                                    {executionState.live_output}
                                </pre>
                            </div>
                        ) : (
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    No live output available
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Workflow Inputs */}
            {inputVariables.length > 0 && <WorkflowInputs inputs={inputVariables} />}

        </div>
    );
}; 