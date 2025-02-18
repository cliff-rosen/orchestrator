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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Workflow Steps</h2>
            {workflow.steps.map((step, index) => (
                <div
                    key={step.step_id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${needsInput && index === 0
                        ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20'
                        : currentStepIndex === index
                            ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20'
                            : index < currentStepIndex
                                ? 'border-green-500 bg-green-50/10 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${needsInput && index === 0
                            ? 'bg-blue-500 text-white'
                            : currentStepIndex === index
                                ? 'bg-blue-500 text-white'
                                : index < currentStepIndex
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                            {index + 1}
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-50">
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