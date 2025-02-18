import React from 'react';
import { Job, JobStatus } from '../../types/jobs';

interface JobLiveOutputProps {
    job: Job;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job }) => {
    const isComplete = job.status === JobStatus.COMPLETED;
    const isFailed = job.status === JobStatus.FAILED;

    if (isComplete) {
        return (
            <div className="space-y-6">
                {/* Job Summary Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                            Job Summary
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Workflow execution completed successfully
                        </p>
                    </div>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-600/20 dark:ring-green-300/20">
                        Completed
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Workflow Inputs */}
                    {job.input_variables && job.input_variables.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Workflow Inputs
                                </h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {job.input_variables.map((variable) => (
                                    <div key={variable.variable_id} className="text-sm flex items-start">
                                        <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                                            {variable.schema.name}
                                        </span>
                                        <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
                                        <span className="text-gray-700 dark:text-gray-200 flex-1">
                                            {typeof variable.value === 'object'
                                                ? JSON.stringify(variable.value, null, 2)
                                                : String(variable.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Final Output */}
                    {job.output_data && Object.keys(job.output_data).length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Final Output
                                </h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {Object.entries(job.output_data).map(([key, value]) => (
                                    <div key={key} className="text-sm flex items-start">
                                        <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                                            {key}
                                        </span>
                                        <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
                                        <span className="text-gray-700 dark:text-gray-200 flex-1">
                                            {typeof value === 'object'
                                                ? JSON.stringify(value, null, 2)
                                                : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // For running or failed jobs, show current step info
    const currentStepIndex = job.execution_progress?.current_step || 0;
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
                                const value = job.input_variables?.find(v =>
                                    v.variable_id === mapping || v.schema.name === mapping
                                )?.value || mapping;

                                return (
                                    <div key={key} className="text-sm">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                        <span className="text-gray-400 dark:text-gray-500"> = </span>
                                        <span className="text-gray-700 dark:text-gray-200">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Live Output */}
            {job.live_output && currentStep.status === JobStatus.RUNNING && (
                <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Live Output
                    </h4>
                    <pre className="text-sm overflow-auto max-h-32 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                        {job.live_output}
                    </pre>
                </div>
            )}

            {/* Error Message */}
            {isFailed && currentStep.error_message && (
                <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-lg p-4">
                    <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                        Error
                    </h4>
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                        {currentStep.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 