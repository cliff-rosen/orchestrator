import React from 'react';
import { StateManager } from '../hooks/schema/types';
import { Tool } from '../types/tools';
import { RuntimeWorkflowStep } from '../types/workflows';
import ActionStepEditor from './ActionStepEditor';
import InputStepRunner from './InputStepRunner';
import ActionStepRunner from './ActionStepRunner';
import { WorkflowStepType } from '../types/workflows';

interface StepDetailProps {
    step: RuntimeWorkflowStep;
    stateManager: StateManager;
    isEditMode: boolean;
    tools: Tool[];
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
}

const StepDetail: React.FC<StepDetailProps> = ({
    step,
    stateManager,
    isEditMode,
    tools,
    onStepUpdate
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
        return (
            <ActionStepEditor
                step={step}
                tools={tools}
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
            actionStep={step} // Changed from step to actionStep to match props
            stateManager={stateManager}
        />
    );
};

export default StepDetail; 