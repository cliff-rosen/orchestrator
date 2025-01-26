import React from 'react';
import { RuntimeWorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';
import ActionStepEditor from './ActionStepEditor';
import InputStepRunner from './InputStepRunner';
import ActionStepRunner from './ActionStepRunner';

interface StepDetailProps {
    step: RuntimeWorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
}

const StepDetail: React.FC<StepDetailProps> = ({
    step,
    stateManager,
    isEditMode,
    onStepUpdate
}) => {
    if (!step) {
        return <div>Error: No step provided</div>;
    }

    const isInputStep = step.stepType === 'INPUT';

    // In edit mode, input steps are configured in WorkflowConfig
    if (isEditMode && isInputStep) {
        return <div className="text-red-600">Input steps cannot be edited here. Please use the Schema configuration.</div>;
    }

    // In edit mode, action steps use the editor
    if (isEditMode) {
        return (
            <ActionStepEditor
                step={step}
                stateManager={stateManager}
                onStepUpdate={onStepUpdate}
            />
        );
    }

    // In run mode, show appropriate runner based on step type
    if (isInputStep) {
        return (
            <InputStepRunner
                stateManager={stateManager}
            />
        );
    }

    return (
        <ActionStepRunner
            step={step}
            stateManager={stateManager}
            onStepUpdate={onStepUpdate}
        />
    );
};

export default StepDetail; 