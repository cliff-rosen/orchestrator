import React, { useState } from 'react';
import { Job } from '../../types/jobs';
import VariableRenderer from '../common/VariableRenderer';
import { JobEngine } from '../../lib/job/jobEngine';

interface JobSummaryProps {
    job: Job;
}

/**
 * JobSummary component displays only the inputs and final outputs of a job
 * in a compact, clean format without showing intermediate step results.
 */
export const JobSummary: React.FC<JobSummaryProps> = ({ job }) => {
    const [showAllState, setShowAllState] = useState(false);

    // Get variables using JobEngine methods
    const inputVariables = JobEngine.getInputVariables(job);
    const outputVariables = JobEngine.getFinalOutputVariables(job);
    const allStateVariables = JobEngine.getAllStateVariables(job);

    const toggleAllState = () => {
        setShowAllState(!showAllState);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                    Job Summary
                </h2>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>

                    {job.started_at && job.completed_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())}
                        </span>
                    )}
                </div>
            </div>

            {/* Error Message - Compact Version */}
            {job.error_message && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 p-2 mb-4 text-sm text-red-800 dark:text-red-300">
                    <strong>Error:</strong> {job.error_message}
                </div>
            )}

            {/* Compact Variables Layout */}
            <div className="space-y-4">
                {/* Input Variables */}
                {inputVariables.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                            Inputs
                        </h3>
                        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {inputVariables.map((variable, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 w-1/4">
                                                {String(variable.name)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-h-20 overflow-y-auto">
                                                    <VariableRenderer
                                                        value={variable.value}
                                                        schema={variable.schema}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Output Variables - Only from final step */}
                {outputVariables.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                            Final Outputs
                        </h3>
                        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {outputVariables.map((variable, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 w-1/4">
                                                {String(variable.name)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-h-20 overflow-y-auto">
                                                    <VariableRenderer
                                                        value={variable.value}
                                                        schema={variable.schema}
                                                        isMarkdown={true}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Collapsible All State Section */}
                <div className="mt-4">
                    <button
                        onClick={toggleAllState}
                        className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        <span className="w-4 h-4 inline-block text-center font-bold">
                            {showAllState ? '▼' : '►'}
                        </span>
                        <span>
                            {showAllState ? 'Hide all state variables' : 'Show all state variables'}
                        </span>
                    </button>

                    {showAllState && (
                        <div className="mt-2 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">
                                            Name
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/6">
                                            Type
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Value
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {allStateVariables.map((variable, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700">
                                                {String(variable.name)}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full ${variable.io_type === 'input' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    variable.io_type === 'output' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                                    }`}>
                                                    {variable.io_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-h-20 overflow-y-auto">
                                                    <VariableRenderer
                                                        value={variable.value}
                                                        schema={variable.schema}
                                                        isMarkdown={variable.io_type === 'output'}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper function to format duration
const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}; 