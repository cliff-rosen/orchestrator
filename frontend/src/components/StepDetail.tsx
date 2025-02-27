import React from 'react';
import { RuntimeWorkflowStep, WorkflowStepType, WorkflowStep } from '../types/workflows';
import ActionStepEditor from './ActionStepEditor';
import InputStepRunner from './InputStepRunner';
import ActionStepRunner from './ActionStepRunner';
import EvaluationStepRunner from './EvaluationStepRunner';

interface StepDetailProps {
    step: RuntimeWorkflowStep;
    isEditMode: boolean;
    isInputRequired: boolean;
    stepExecuted: boolean;
    isExecuting: boolean;
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
    onStepDelete: (stepId: string) => void;
}

const StepDetail: React.FC<StepDetailProps> = ({
    step,
    isEditMode,
    isInputRequired,
    stepExecuted,
    isExecuting,
    onStepUpdate,
    onStepDelete
}) => {
    if (!step) {
        return <div>Error: No step provided</div>;
    }


    const isInputStep = isInputRequired
    const isEvaluationStep = step.step_type === WorkflowStepType.EVALUATION;

    // In edit mode, action and evaluation steps use the editor
    if (isEditMode) {
        // Convert RuntimeWorkflowStep to WorkflowStep for ActionStepEditor
        const {
            action,
            actionButtonText,
            isDisabled,
            getValidationErrors,
            ...workflowStep
        } = step;

        return (
            <ActionStepEditor
                step={workflowStep as WorkflowStep}
                onStepUpdate={(updatedStep) => {
                    // Add back runtime properties when updating
                    onStepUpdate({
                        ...updatedStep,
                        action,
                        actionButtonText,
                        isDisabled,
                        getValidationErrors
                    } as RuntimeWorkflowStep);
                }}
                onDeleteRequest={() => onStepDelete(step.step_id)}
            />
        );
    }

    // In run mode, show appropriate runner based on step type
    if (isInputStep) {
        return <InputStepRunner />;
    }

    if (isEvaluationStep) {
        return (
            <EvaluationStepRunner
                step={step}
                isExecuted={stepExecuted}
                isExecuting={isExecuting}
            />
        );
    }

    return (
        <ActionStepRunner
            actionStep={step}
            isExecuted={stepExecuted}
            isExecuting={isExecuting}
        />
    );
};

export default StepDetail; 