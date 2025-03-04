import React from 'react';
import { Link } from 'react-router-dom';
import { Job, JobStatus, JobStep } from '../../types/jobs';
import { Workflow } from '../../types/workflows';
import { WorkflowInputs } from './WorkflowInputs';
import { WorkflowOutputs } from './WorkflowOutputs';
import { SchemaValueType } from '../../types/schema';
import { JobEngine } from '../../lib/job/jobEngine';

interface JobLiveOutputProps {
    job: Job;
    workflow: Workflow;
    step?: JobStep;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job, workflow, step }) => {

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

    return (
        <div className="space-y-6">
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

            {/* Workflow Inputs */}
            {inputVariables.length > 0 && <WorkflowInputs inputs={inputVariables} />}

            {/* Workflow Outputs */}
            <WorkflowOutputs finalStepOutput={finalStepOutput} otherOutputs={otherOutputs} />
        </div>
    );
}; 