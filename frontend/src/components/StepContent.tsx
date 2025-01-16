import React from 'react';
import { WorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';
import ActionEditor from './ActionEditor';
import InputStepContent from './InputStepContent';
import ActionStepContent from './ActionStepContent';

interface StepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
    onStepUpdate: (step: WorkflowStep) => void;
}

const StepContent: React.FC<StepContentProps> = ({
    step,
    stateManager,
    isEditMode,
    onStepUpdate
}) => {
    if (!step) {
        return <div>Error: No step provided</div>;
    }

    const isInputStep = step.stepType === 'INPUT';

    if (isEditMode) {
        if (isInputStep) {
            return <div>ERROR - StepContent should not be called in edit mode for input steps</div>;
        } else {
            return <ActionEditor
                step={step}
                stateManager={stateManager}
                onStepUpdate={onStepUpdate}
            />;
        }
    }

    if (isInputStep) {
        return <InputStepContent stateManager={stateManager} />;
    } else {
        return <ActionStepContent
            step={step}
            stateManager={stateManager}
            onStepUpdate={onStepUpdate}
        />;
    }
};

export default StepContent; 