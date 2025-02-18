import React from 'react';
import { Job, JobStatus } from '../../types/jobs';

interface JobLiveOutputProps {
    job: Job;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job }) => {
    // Always show the last executed step, or the last step if job is complete
    const currentStepIndex = job.execution_progress?.current_step || 0;
    const lastExecutedIndex = job.steps.findIndex(step => step.status === JobStatus.PENDING) - 1;
    const displayIndex = job.status === JobStatus.COMPLETED ? job.steps.length - 1 :
        lastExecutedIndex >= 0 ? lastExecutedIndex : currentStepIndex;
    const currentStep = job.steps[displayIndex];

    if (!currentStep) return null;

    // Get the actual input values from the job's variables
    const getInputValue = (mapping: string) => {
        if (!job.input_variables) return mapping;
        const variable = job.input_variables.find(v => v.variable_id === mapping || v.schema.name === mapping);
        return variable ? variable.value : mapping;
    };

    return (
        <div className="space-y-4">
            {/* Current Step Info */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {currentStep.tool?.name || 'Unknown Tool'}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {currentStep.tool?.description}
                    </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStep.status === JobStatus.COMPLETED ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                    currentStep.status === JobStatus.FAILED ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                        currentStep.status === JobStatus.RUNNING ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                    {currentStep.status}
                </span>
            </div>

            {/* Current Step Details */}
            <div className="space-y-3">
                <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {/* Step Name Header */}
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {currentStep.tool?.name || 'Current Step'}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStep.status === JobStatus.COMPLETED ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                                currentStep.status === JobStatus.FAILED ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                    currentStep.status === JobStatus.RUNNING ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {currentStep.status}
                            </span>
                        </div>
                        {currentStep.tool?.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {currentStep.tool.description}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Input Parameters - Left Column */}
                        <div>
                            {currentStep.parameter_mappings && Object.keys(currentStep.parameter_mappings).length > 0 && (
                                <div>
                                    <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        Inputs
                                    </h4>
                                    <div className="space-y-1">
                                        {Object.entries(currentStep.parameter_mappings).map(([key, mapping]) => (
                                            <div key={key} className="text-sm">
                                                <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                                <span className="text-gray-400 dark:text-gray-500"> = </span>
                                                <span className="text-gray-700 dark:text-gray-200">
                                                    {JSON.stringify(getInputValue(mapping))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Middle Column - Step Info */}
                        <div className="flex flex-col items-center justify-start">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                    {`${displayIndex + 1}`}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {currentStep.tool?.name || 'No tool'}
                                </p>
                            </div>
                        </div>

                        {/* Outputs - Right Column */}
                        <div>
                            {currentStep.output_data && Object.keys(currentStep.output_data).length > 0 && (
                                <div>
                                    <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        Outputs
                                    </h4>
                                    <div className="space-y-1">
                                        {Object.entries(currentStep.output_data).map(([key, value]) => (
                                            <div key={key} className="text-sm">
                                                <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                                <span className="text-gray-400 dark:text-gray-500"> = </span>
                                                <span className="text-gray-700 dark:text-gray-200">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Output - Full Width */}
                {job.live_output && currentStep.status === JobStatus.RUNNING && (
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Live Output
                        </h4>
                        <pre className="text-sm overflow-auto max-h-32 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                            {job.live_output}
                        </pre>
                    </div>
                )}

                {/* Error Message - Full Width */}
                {currentStep.status === JobStatus.FAILED && currentStep.error_message && (
                    <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                            Error
                        </h4>
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                            {currentStep.error_message}
                        </p>
                    </div>
                )}
            </div>

            {/* Final Job Output - Full Width */}
            {job.status === JobStatus.COMPLETED && job.output_data && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Final Job Output
                        </h4>
                        <div className="space-y-1">
                            {Object.entries(job.output_data).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                    <span className="text-gray-400 dark:text-gray-500"> = </span>
                                    <span className="text-gray-700 dark:text-gray-200">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 