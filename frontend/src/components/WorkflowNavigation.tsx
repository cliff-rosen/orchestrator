import React from 'react';
import { WorkflowStepType } from '../types/workflows';

interface WorkflowNavigationProps {
    isEditMode: boolean;
    activeStep: number;
    totalSteps: number;
    stepType: WorkflowStepType;
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
    stepType,
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
        <div className="mt-4 flex justify-between">
            {/* Back Button */}
            <button
                onClick={onBack}
                disabled={activeStep === 0}
                className={`px-4 py-2 rounded-lg ${activeStep === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >
                Back
            </button>

            {/* Right Side Actions */}
            <div className="flex gap-2">
                {/* Execute Tool Button */}
                {stepType === WorkflowStepType.ACTION && (
                    <button
                        onClick={onExecute}
                        disabled={isLoading || stepExecuted}
                        className={`px-4 py-2 rounded-lg ${isLoading || stepExecuted
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isLoading ? 'Processing...' : 'Execute Tool'}
                    </button>
                )}

                {/* Next/Restart Button */}
                {(stepType === WorkflowStepType.INPUT || stepExecuted) && (
                    activeStep === totalSteps - 1 ? (
                        <button
                            onClick={onRestart}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                            Restart Flow
                        </button>
                    ) : (
                        <button
                            onClick={onNext}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                            Next Step
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default WorkflowNavigation; 