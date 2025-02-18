import React from 'react';
import { Job, JobStatus } from '../../types/jobs';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JobLiveOutputProps {
    job: Job;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job }) => {
    const currentStepIndex = job.execution_progress?.current_step || 0;
    const currentStep = job.steps[currentStepIndex];
    const isComplete = job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED;

    if (!currentStep) return null;

    return (
        <div className="space-y-4">
            {/* Current Step Info */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentStep.tool?.name || 'Unknown Tool'}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {currentStep.tool?.description}
                    </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStep.status === JobStatus.COMPLETED ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        currentStep.status === JobStatus.FAILED ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            currentStep.status === JobStatus.RUNNING ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                    {currentStep.status}
                </span>
            </div>

            {/* Current Step Details */}
            <div className="space-y-3">
                {/* Input Parameters */}
                {currentStep.parameter_mappings && Object.keys(currentStep.parameter_mappings).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Inputs
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(currentStep.parameter_mappings).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                                    <span className="ml-2 text-gray-900 dark:text-gray-50">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Output */}
                {job.live_output && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Live Output
                        </h4>
                        <pre className="text-sm overflow-auto max-h-32 text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                            {job.live_output}
                        </pre>
                    </div>
                )}

                {/* Current Step Output */}
                {currentStep.output_data && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Step Output
                        </h4>
                        <pre className="text-sm overflow-auto text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                            {JSON.stringify(currentStep.output_data, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Error Message */}
                {currentStep.status === JobStatus.FAILED && currentStep.error_message && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-semibold text-red-800 dark:text-red-400 mb-1">
                            Error
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            {currentStep.error_message}
                        </p>
                    </div>
                )}
            </div>

            {/* Final Job Output */}
            {isComplete && job.output_data && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Final Job Output
                        </h4>
                        <pre className="text-sm overflow-auto max-h-48 text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                            {JSON.stringify(job.output_data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}; 