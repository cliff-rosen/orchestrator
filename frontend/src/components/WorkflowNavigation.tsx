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
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
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
                        className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md flex items-center space-x-2 
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                        className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md flex items-center space-x-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                        New Question
                    </button>
                )}
            </div>
        </div>
    );
};

export default WorkflowNavigation; 