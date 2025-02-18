import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Job, JobStatus } from '../../types/jobs';

// Constants for text truncation
const MAX_TEXT_LENGTH = 200;  // Characters for text
const MAX_ARRAY_LENGTH = 3;   // Items for arrays
const MAX_ARRAY_ITEM_LENGTH = 100;  // Characters per array item

interface JobLiveOutputProps {
    job: Job;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job }) => {
    const isComplete = job.status === JobStatus.COMPLETED;
    const isFailed = job.status === JobStatus.FAILED;
    const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedValues(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Helper function to format values for display
    const formatValue = (value: any, isOutput: boolean = false) => {
        if (value === undefined || value === null) {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        // Handle array values
        if (Array.isArray(value)) {
            const id = `array-${JSON.stringify(value).slice(0, 50)}`;
            const isExpanded = expandedValues[id];
            const items = value;
            const displayItems = isExpanded ? items : items.slice(0, MAX_ARRAY_LENGTH);
            const hasMore = items.length > MAX_ARRAY_LENGTH;

            return (
                <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                    {displayItems.map((item: any, index: number) => {
                        const itemStr = String(item);
                        const truncatedItem = isExpanded ? itemStr :
                            itemStr.length > MAX_ARRAY_ITEM_LENGTH ?
                                `${itemStr.substring(0, MAX_ARRAY_ITEM_LENGTH)}...` : itemStr;

                        return (
                            <div key={index} className="text-sm font-medium text-gray-900 dark:text-white p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                <span className="font-normal text-gray-500 dark:text-gray-400 mr-2">{index + 1}.</span>
                                {truncatedItem}
                            </div>
                        );
                    })}
                    {hasMore && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                     dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                     dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : `Show ${items.length - MAX_ARRAY_LENGTH} More...`}
                        </button>
                    )}
                </div>
            );
        }

        // Handle text values
        const text = String(value);
        const id = `text-${text.slice(0, 50)}`;
        const isExpanded = expandedValues[id];

        // For output values or text containing markdown, use ReactMarkdown
        if (isOutput || text.includes('|') || text.includes('#') || text.includes('*')) {
            const displayText = text.length > MAX_TEXT_LENGTH && !isExpanded
                ? `${text.substring(0, MAX_TEXT_LENGTH)}...`
                : text;

            return (
                <div className="space-y-2">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: props => (
                                        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
                                            {props.children}
                                        </table>
                                    ),
                                    thead: props => (
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            {props.children}
                                        </thead>
                                    ),
                                    tbody: props => (
                                        <tbody className="bg-white dark:bg-gray-900">
                                            {props.children}
                                        </tbody>
                                    ),
                                    tr: props => (
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            {props.children}
                                        </tr>
                                    ),
                                    th: props => (
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                            {props.children}
                                        </th>
                                    ),
                                    td: props => (
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                            {props.children}
                                        </td>
                                    ),
                                    code: props => (
                                        <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono text-gray-900 dark:text-gray-100">
                                            {props.children}
                                        </code>
                                    ),
                                    pre: props => (
                                        <pre className="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto text-gray-900 dark:text-gray-100">
                                            {props.children}
                                        </pre>
                                    )
                                }}
                            >
                                {displayText}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {text.length > MAX_TEXT_LENGTH && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                     dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                     dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : 'Show More...'}
                        </button>
                    )}
                </div>
            );
        }

        // For regular text without markdown
        if (text.length <= MAX_TEXT_LENGTH) {
            return (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-base text-gray-900 dark:text-white whitespace-pre-wrap font-normal">
                        {text}
                    </div>
                </div>
            );
        }

        const truncatedText = isExpanded ? text : `${text.substring(0, MAX_TEXT_LENGTH)}...`;

        return (
            <div className="space-y-2">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-base text-gray-900 dark:text-white whitespace-pre-wrap font-normal">
                        {truncatedText}
                    </div>
                </div>
                <button
                    onClick={() => toggleExpand(id)}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    {isExpanded ? 'Show Less' : 'Show More...'}
                </button>
            </div>
        );
    };

    if (isComplete) {
        // Get the final step's output
        const finalStep = job.steps[job.steps.length - 1];
        const finalStepOutput = finalStep?.output_data || {};

        // Get all other outputs from job.output_data that aren't in the final step
        const otherOutputs = Object.entries(job.output_data || {}).reduce((acc, [key, value]) => {
            if (!(key in finalStepOutput)) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, any>);

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

                {/* Workflow Inputs - Full Width */}
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
                        <div className="p-4 grid grid-cols-2 gap-4">
                            {job.input_variables.map((variable) => (
                                <div key={variable.variable_id} className="text-sm flex items-start">
                                    <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                                        {variable.schema.name}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
                                    <span className="text-gray-700 dark:text-gray-200 flex-1">
                                        {formatValue(variable.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Final Step Output */}
                {Object.keys(finalStepOutput).length > 0 && (
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
                            {Object.entries(finalStepOutput).map(([key, value]) => (
                                <div key={key} className="text-sm flex items-start">
                                    <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                                        {key}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
                                    <span className="text-gray-700 dark:text-gray-200 flex-1">
                                        {formatValue(value, true)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Other Outputs (Collapsible) */}
                {Object.keys(otherOutputs).length > 0 && (
                    <details className="group">
                        <summary className="cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Intermediate Outputs
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {Object.keys(otherOutputs).length} outputs
                            </span>
                        </summary>
                        <div className="mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                            {Object.entries(otherOutputs).map(([key, value]) => (
                                <div key={key} className="text-sm flex items-start">
                                    <span className="font-medium text-gray-600 dark:text-gray-300 min-w-[120px]">
                                        {key}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 mx-2">=</span>
                                    <span className="text-gray-700 dark:text-gray-200 flex-1">
                                        {formatValue(value, true)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
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
                                            {formatValue(value)}
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
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {job.live_output}
                        </ReactMarkdown>
                    </div>
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