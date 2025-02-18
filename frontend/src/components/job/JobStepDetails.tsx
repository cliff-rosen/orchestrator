import React, { useState } from 'react';
import { Job, JobStatus } from '../../types/jobs';
import { ChevronDown } from 'lucide-react';
import { useValueFormatter } from '../../hooks/useValueFormatter.tsx';
import { PromptTemplateLink } from './PromptTemplateLink';

interface JobStepCardProps {
    step: Job['steps'][0];
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    job: Job;
}

const JobStepCard: React.FC<JobStepCardProps> = ({ step, index, isExpanded, onToggle, job }) => {
    const { formatValue } = useValueFormatter();

    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Get the actual input values from the job's variables
    const getInputValue = (mapping: string) => {
        if (!job.input_variables) return mapping;

        // First try to find by variable_id
        const variable = job.input_variables.find(v => v.variable_id === mapping);
        if (variable) {
            return variable.value;
        }

        // Then try to find by schema name
        const variableByName = job.input_variables.find(v => v.schema.name === mapping);
        if (variableByName) {
            return variableByName.value;
        }

        // If not found in variables, return the mapping itself as it might be a direct value
        return mapping;
    };

    const hasDetails = step.tool ||
        (step.parameter_mappings && Object.keys(step.parameter_mappings).length > 0) ||
        (step.output_data && Object.keys(step.output_data).length > 0) ||
        step.error_message;

    return (
        <div
            className={`border rounded-lg overflow-hidden transition-all duration-200 ${step.status === JobStatus.RUNNING ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10' :
                step.status === JobStatus.COMPLETED ? 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10' :
                    step.status === JobStatus.FAILED ? 'border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10' :
                        'border-gray-200 dark:border-gray-700'
                }`}
        >
            <button
                onClick={() => hasDetails && onToggle()}
                className={`w-full px-4 py-3 flex items-center justify-between text-left ${hasDetails ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30' : ''
                    }`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step.status === JobStatus.RUNNING ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                        step.status === JobStatus.COMPLETED ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                            step.status === JobStatus.FAILED ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                        {index + 1}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {`Step ${index + 1}`}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(step.started_at)}
                                {step.completed_at && ` - ${formatTimestamp(step.completed_at)}`}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {step.tool?.name}
                            </p>
                            {step.tool?.tool_type === 'llm' && step.prompt_template && (
                                <div className="text-xs">
                                    <PromptTemplateLink templateId={step.prompt_template} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {hasDetails && (
                    <ChevronDown
                        className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''
                            }`}
                    />
                )}
            </button>

            {isExpanded && hasDetails && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Inputs and Outputs */}
                    <div className="space-y-4">
                        {/* Input Parameters */}
                        {step.parameter_mappings && Object.keys(step.parameter_mappings).length > 0 && (
                            <div>
                                <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Inputs
                                </h4>
                                <div className="space-y-1">
                                    {Object.entries(step.parameter_mappings).map(([key, mapping]) => (
                                        <div key={key} className="text-sm">
                                            <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                            <span className="text-gray-400 dark:text-gray-500"> = </span>
                                            <span className="text-gray-700 dark:text-gray-200">
                                                {formatValue(getInputValue(mapping))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Outputs */}
                        {step.output_data && Object.keys(step.output_data).length > 0 && (
                            <div>
                                <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Outputs
                                </h4>
                                <div className="space-y-1">
                                    {Object.entries(step.output_data).map(([key, value]) => (
                                        <div key={key} className="text-sm">
                                            <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                            <span className="text-gray-400 dark:text-gray-500"> = </span>
                                            <span className="text-gray-700 dark:text-gray-200">
                                                {formatValue(value, true)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {step.status === JobStatus.FAILED && step.error_message && (
                        <div className="mt-4">
                            <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                                Error
                            </h4>
                            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50/30 dark:bg-rose-900/20 rounded p-2 border border-rose-200 dark:border-rose-900">
                                {step.error_message}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface JobStepDetailsProps {
    job: Job;
}

export const JobStepDetails: React.FC<JobStepDetailsProps> = ({ job }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    // Filter to only show executed steps
    const executedSteps = job.steps.filter(step => step.status !== JobStatus.PENDING);

    return (
        <div className="space-y-2">
            {/* Steps List */}
            {executedSteps.map((step, index) => (
                <JobStepCard
                    key={step.step_id}
                    step={step}
                    index={job.steps.findIndex(s => s.step_id === step.step_id)} // Keep original step index for numbering
                    isExpanded={expandedSteps.has(index)}
                    onToggle={() => toggleStep(index)}
                    job={job}
                />
            ))}

            {/* Job Error */}
            {job.error_message && (
                <div className="mt-4 border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-lg p-4">
                    <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                        Job Error
                    </h4>
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 