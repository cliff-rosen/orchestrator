import React from 'react';
import { Job } from '../../types/jobs';
import { useValueFormatter } from '../../hooks/useValueFormatter';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';

interface JobSummaryProps {
    job: Job;
}

/**
 * JobSummary component displays only the inputs and final outputs of a job
 * in a simple, clean format without showing intermediate step results.
 */
export const JobSummary: React.FC<JobSummaryProps> = ({ job }) => {
    const { formatValue } = useValueFormatter();

    // Get input variables
    const getInputVariables = () => {
        return job.state.filter(variable => variable.io_type === 'input');
    };

    // Get final output variables (excluding evaluation variables)
    const getOutputVariables = () => {
        return job.state.filter(variable =>
            variable.io_type === 'output' &&
            !variable.name.toString().startsWith('__eval_')
        );
    };

    const inputVariables = getInputVariables();
    const outputVariables = getOutputVariables();

    return (
        <div className="space-y-6">
            {/* Job Information */}
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
                    {job.name}
                </h3>
                {job.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {job.description}
                    </p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Status: <span className={`font-medium ${job.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            job.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                job.status === 'running' ? 'text-blue-600 dark:text-blue-400' :
                                    'text-gray-600 dark:text-gray-400'
                        }`}>{job.status}</span></span>
                    {job.started_at && (
                        <span>• Started: {new Date(job.started_at).toLocaleString()}</span>
                    )}
                    {job.completed_at && (
                        <span>• Completed: {new Date(job.completed_at).toLocaleString()}</span>
                    )}
                </div>
            </div>

            {/* Input Variables */}
            {inputVariables.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-md font-medium mb-3 text-gray-900 dark:text-gray-100">
                        Input Variables
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="text-left p-2 border-b border-gray-200 dark:border-gray-600">Name</th>
                                <th className="text-left p-2 border-b border-gray-200 dark:border-gray-600">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inputVariables.map((variable, index) => (
                                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-2 font-medium">{String(variable.name)}</td>
                                    <td className="p-2">{formatValue(variable.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Output Variables */}
            {outputVariables.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-md font-medium mb-3 text-gray-900 dark:text-gray-100">
                        Final Outputs
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="text-left p-2 border-b border-gray-200 dark:border-gray-600">Name</th>
                                <th className="text-left p-2 border-b border-gray-200 dark:border-gray-600">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outputVariables.map((variable, index) => (
                                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-2 font-medium">{String(variable.name)}</td>
                                    <td className="p-2">{formatValue(variable.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Error Message */}
            {job.error_message && (
                <div className="bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-900 p-4">
                    <h3 className="text-md font-medium mb-2 text-red-800 dark:text-red-300">
                        Error
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 