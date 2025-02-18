import React from 'react';
import { useValueFormatter } from '../../hooks/useValueFormatter.tsx';

interface OutputData {
    [key: string]: any;
}

interface WorkflowOutputsProps {
    finalStepOutput: OutputData;
    otherOutputs: OutputData;
}

export const WorkflowOutputs: React.FC<WorkflowOutputsProps> = ({ finalStepOutput, otherOutputs }) => {
    const { formatValue } = useValueFormatter();

    const renderOutputSection = (data: OutputData, title: string, icon: React.ReactNode) => {
        if (Object.keys(data).length === 0) return null;

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        {icon}
                        {title}
                    </h3>
                </div>
                <div className="p-4 space-y-2">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="text-sm grid grid-cols-[150px_30px_1fr] items-start">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                {key}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-center">=</span>
                            <div className="text-gray-700 dark:text-gray-200 min-w-0">
                                {formatValue(value, true)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const finalOutputIcon = (
        <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const intermediateOutputIcon = (
        <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );

    return (
        <>
            {renderOutputSection(finalStepOutput, "Final Output", finalOutputIcon)}
            {Object.keys(otherOutputs).length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            {intermediateOutputIcon}
                            Intermediate Outputs
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Object.keys(otherOutputs).length} outputs
                        </span>
                    </summary>
                    <div className="mt-2">
                        {renderOutputSection(otherOutputs, "Intermediate Outputs", null)}
                    </div>
                </details>
            )}
        </>
    );
}; 