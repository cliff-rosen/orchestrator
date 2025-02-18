import React from 'react';
import { Job, JobStatus } from '../../types/jobs';
import { Workflow } from '../../types/workflows';

interface JobStepsListProps {
    job: Job;
    workflow: Workflow;
    needsInput: boolean;
}

export const JobStepsList: React.FC<JobStepsListProps> = ({ job, workflow, needsInput }) => {
    const currentStepIndex = job.execution_progress?.current_step || 0;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Workflow Steps</h2>
            {workflow.steps.map((step, index) => (
                <div
                    key={step.step_id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${needsInput && index === 0
                            ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10'
                            : currentStepIndex === index
                                ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10'
                                : index < currentStepIndex
                                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10'
                                    : 'border-gray-200 dark:border-gray-700'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${needsInput && index === 0
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : currentStepIndex === index
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                    : index < currentStepIndex
                                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                            {index + 1}
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-700 dark:text-gray-200">
                                {step.label || `Step ${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {step.description}
                            </p>
                            {step.tool && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Tool: {step.tool.name}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}; 