import React from 'react';
import { WorkflowStepType } from '../types/workflows';

interface WorkflowNavigationProps {
    isEditMode: boolean;
    activeStep: number;
    totalSteps: number;
    step_type: WorkflowStepType;
    isLoading: boolean;
    stepExecuted: boolean;
    onBack: () => void;
    onNext: () => void;
    onExecute: () => void;
    onRestart: () => void;
}

const WorkflowNavigation: React.FC<WorkflowNavigationProps> = ({
    isEditMode,
    activeStep,
    totalSteps,
    step_type,
    isLoading,
    stepExecuted,
    onBack,
    onNext,
    onExecute,
    onRestart
}) => {
    // Only show navigation in run mode
    if (isEditMode) return null;

    return (
        <div className="flex justify-between mt-4">
            {/* Back button */}
            <div>
                {activeStep > 0 && (
                    <button
                        onClick={onBack}
                        className="inline-flex items-center justify-center rounded-md
                                 px-3 py-1.5 text-sm font-medium
                                 text-gray-500 hover:text-gray-700 hover:bg-gray-100
                                 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                {step_type === WorkflowStepType.ACTION && (
                    <button
                        onClick={onExecute}
                        disabled={isLoading}
                        className={`inline-flex items-center justify-center rounded-md
                                  px-3 py-1.5 text-sm font-medium
                                  ${isLoading
                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                            }
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                  transition-colors`}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                <span>Running...</span>
                            </>
                        ) : (
                            <span>{stepExecuted ? 'Re-execute Tool' : 'Execute Tool'}</span>
                        )}
                    </button>
                )}

                {(step_type === WorkflowStepType.INPUT || stepExecuted) && activeStep < totalSteps - 1 && (
                    <button
                        onClick={onNext}
                        disabled={isLoading}
                        className={`inline-flex items-center justify-center rounded-md
                                  px-3 py-1.5 text-sm font-medium
                                  ${isLoading
                                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                            }
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                  transition-colors`}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>Next</span>
                        )}
                    </button>
                )}

                {activeStep === totalSteps - 1 && stepExecuted && (
                    <button
                        onClick={onRestart}
                        className="inline-flex items-center justify-center rounded-md
                                 px-3 py-1.5 text-sm font-medium
                                 text-gray-500 hover:text-gray-700 hover:bg-gray-100
                                 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                 transition-colors"
                    >
                        New Question
                    </button>
                )}
            </div>
        </div>
    );
};

export default WorkflowNavigation; 