import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import ActionStepEditor from './ActionStepEditor';
import InputStepRunner from './InputStepRunner';
import ActionStepRunner from './ActionStepRunner';
import { WorkflowStepType } from '../types/workflows';

interface StepDetailProps {
    step: RuntimeWorkflowStep;
    isEditMode: boolean;
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
    onStepDelete: (stepId: string) => void;
}

const StepDetail: React.FC<StepDetailProps> = ({
    step,
    isEditMode,
    onStepUpdate,
    onStepDelete
}) => {
    if (!step) {
        return <div>Error: No step provided</div>;
    }

    const isInputStep = step.step_type === WorkflowStepType.INPUT;

    // In edit mode, input steps are configured in WorkflowConfig
    if (isEditMode && isInputStep) {
        return <div className="text-red-600">Input steps cannot be edited here. Please use the Schema configuration.</div>;
    }

    // In edit mode, action steps use the editor
    if (isEditMode) {
        // Convert RuntimeWorkflowStep to WorkflowStep for ActionStepEditor
        const { action, actionButtonText, isDisabled, ...workflowStep } = step;
        return (
            <ActionStepEditor
                step={workflowStep}
                onStepUpdate={(updatedStep) => {
                    // Add back runtime properties when updating
                    onStepUpdate({
                        ...updatedStep,
                        action,
                        actionButtonText,
                        isDisabled
                    });
                }}
                onDeleteRequest={() => onStepDelete(step.step_id)}
            />
        );
    }

    // In run mode, show appropriate runner based on step type
    if (isInputStep) {
        return <InputStepRunner />;
    }

    return (
        <ActionStepRunner
            actionStep={step}
        />
    );
};

export default StepDetail; 