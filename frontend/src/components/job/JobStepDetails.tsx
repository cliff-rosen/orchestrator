import React, { useState } from 'react';
import { Job, JobStatus } from '../../types/jobs';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JobStepDetailsProps {
    job: Job;
}

export const JobStepDetails: React.FC<JobStepDetailsProps> = ({ job }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    return (
        <div className="space-y-2">
            {/* Steps List */}
            {job.steps.map((step, index) => {
                const isExpanded = expandedSteps.has(index);
                const hasOutput = step.output_data && Object.keys(step.output_data).length > 0;
                const hasError = step.status === JobStatus.FAILED && step.error_message;
                const showDetails = hasOutput || hasError;

                return (
                    <div
                        key={step.step_id}
                        className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden"
                    >
                        {/* Step Header */}
                        <button
                            onClick={() => showDetails && toggleStep(index)}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left ${showDetails ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50' : ''
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${step.status === JobStatus.COMPLETED ? 'bg-green-500' :
                                        step.status === JobStatus.FAILED ? 'bg-red-500' :
                                            step.status === JobStatus.RUNNING ? 'bg-blue-500 animate-pulse' :
                                                'bg-gray-500'
                                    }`} />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                                    Step {index + 1}: {step.tool?.name || 'Unknown Tool'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTimestamp(step.started_at)}
                                </span>
                            </div>
                            {showDetails && (
                                <div className="flex items-center gap-2">
                                    {hasOutput && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {Object.keys(step.output_data || {}).length} outputs
                                        </span>
                                    )}
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                </div>
                            )}
                        </button>

                        {/* Step Details (Collapsible) */}
                        {isExpanded && showDetails && (
                            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                                {/* Step Output */}
                                {hasOutput && (
                                    <div className="mb-2">
                                        <h4 className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                            Output
                                        </h4>
                                        <pre className="text-sm overflow-auto max-h-32 text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                                            {JSON.stringify(step.output_data, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {/* Error Message */}
                                {hasError && (
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {step.error_message}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Job Error */}
            {job.error_message && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <h4 className="text-xs uppercase font-semibold text-red-800 dark:text-red-400 mb-1">
                        Job Error
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 