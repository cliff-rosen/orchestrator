import React from 'react';
import { WorkflowVariable } from '../../types/workflows';

interface JobInputFormProps {
    workflowInputs: WorkflowVariable[];
    inputValues: Record<string, any>;
    inputErrors: Record<string, string>;
    setInputValue: (variableId: string, value: any) => void;
}

export const JobInputForm: React.FC<JobInputFormProps> = ({
    workflowInputs,
    inputValues,
    inputErrors,
    setInputValue
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-4">
                Configure Job Inputs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Please provide the required inputs to start this job.
            </p>
            <div className="space-y-6">
                {workflowInputs.map(input => (
                    <div key={input.variable_id} className="space-y-2">
                        <label
                            htmlFor={input.variable_id}
                            className="block text-sm font-medium text-gray-900 dark:text-gray-50"
                        >
                            {input.schema.name}
                            <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                        </label>
                        {input.schema.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {input.schema.description}
                            </p>
                        )}
                        {input.schema.type === 'boolean' ? (
                            <div className="flex items-center">
                                <input
                                    id={input.variable_id}
                                    type="checkbox"
                                    checked={!!inputValues[input.variable_id]}
                                    onChange={(e) => setInputValue(input.variable_id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={input.variable_id}
                                    className="ml-2 text-sm text-gray-900 dark:text-gray-50"
                                >
                                    Enable
                                </label>
                            </div>
                        ) : input.schema.type === 'file' ? (
                            <div className="flex items-center">
                                <input
                                    id={input.variable_id}
                                    type="file"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setInputValue(input.variable_id, file);
                                        }
                                    }}
                                    className={`block w-full text-sm
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100
                                        dark:file:bg-blue-900/20 dark:file:text-blue-300
                                        dark:hover:file:bg-blue-900/30
                                        ${inputErrors[input.variable_id]
                                            ? 'text-red-500 dark:text-red-400'
                                            : 'text-gray-900 dark:text-gray-50'
                                        }`}
                                />
                                {inputValues[input.variable_id] && (
                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                        {inputValues[input.variable_id].name}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <input
                                id={input.variable_id}
                                type={input.schema.type === 'number' ? 'number' : 'text'}
                                value={inputValues[input.variable_id] || ''}
                                onChange={(e) => setInputValue(input.variable_id, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800
                                          ${inputErrors[input.variable_id]
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                    } text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500`}
                            />
                        )}
                        {inputErrors[input.variable_id] && (
                            <p className="text-sm text-red-500 dark:text-red-400">
                                {inputErrors[input.variable_id]}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}; 