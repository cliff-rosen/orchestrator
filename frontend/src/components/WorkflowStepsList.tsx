import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';

interface WorkflowStepsListProps {
    steps: RuntimeWorkflowStep[];
    activeStep: number;
    isEditMode: boolean;
    showConfig: boolean;
    onStepClick: (index: number) => void;
    onAddStep: () => void;
}

const WorkflowStepsList: React.FC<WorkflowStepsListProps> = ({
    steps,
    activeStep,
    isEditMode,
    showConfig,
    onStepClick,
    onAddStep
}) => {
    return (
        <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
            {/* Steps List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col gap-4">
                    {steps.map((step, index) => (
                        <div
                            key={`${step.label}-${index}`}
                            onClick={() => onStepClick(index)}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isEditMode ? 'cursor-pointer' : ''}
                                } ${showConfig
                                    ? 'opacity-50 pointer-events-none'
                                    : index === activeStep
                                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-200'
                                        : index < activeStep && !isEditMode
                                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-200'
                                            : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === activeStep
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                                : index < activeStep && !isEditMode
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {!isEditMode && index === 0 ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    !isEditMode ? index : index + 1
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="font-medium">{step.label}</div>
                                <div className="text-xs opacity-80">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Step Button - Fixed at bottom */}
            {isEditMode && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onAddStep}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 
                                 bg-gray-50 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300 
                                 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400
                                 transition-colors text-sm font-medium"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        <span>Add Step</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkflowStepsList; 