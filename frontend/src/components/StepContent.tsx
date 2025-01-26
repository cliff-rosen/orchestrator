import React from 'react';
import { RuntimeWorkflowStep, WorkflowStepType } from '../types';
import { SchemaManager } from '../hooks/schema/types';
import ActionStepEditor from './ActionStepEditor';
import ActionStepContent from './ActionStepContent';

interface StepContentProps {
    step: RuntimeWorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
}

const StepContent: React.FC<StepContentProps> = ({
    step,
    stateManager,
    isEditMode,
    onStepUpdate
}) => {
    // Render different content based on step type
    if (step.stepType === WorkflowStepType.ACTION) {
        if (isEditMode) {
            return (
                <ActionStepEditor
                    step={step}
                    stateManager={stateManager}
                    onStepUpdate={onStepUpdate}
                />
            );
        } else {
            return (
                <ActionStepContent
                    step={step}
                    stateManager={stateManager}
                />
            );
        }
    } else {
        // Input step
        return (
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{step.label}</h2>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                <div className="mt-4">
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Current State:</h3>
                    <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        {JSON.stringify(stateManager.values, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }
};

export default StepContent; 