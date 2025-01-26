import React from 'react';
import { RuntimeWorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';
import { Tool } from '../types';
import ActionStepEditor from './ActionStepEditor';
import InputStepRunner from './InputStepRunner';
import ActionStepRunner from './ActionStepRunner';

interface StepDetailProps {
    step: RuntimeWorkflowStep;
    stateManager: SchemaManager;
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
                tools={tools}
                stateManager={stateManager}
                onStepUpdate={onStepUpdate}
            />
        );
    }

    // In run mode, show appropriate runner based on step type
    if (isInputStep) {
        // Extract input information from the step
        const variableName = Object.keys(step.outputs)[0]; // Input steps map one input to one output
        return (
            <InputStepRunner
                prompt={step.prompt || `Please enter a value for ${variableName}`}
                variableName={variableName}
                stateManager={stateManager}
                onSubmit={(value) => {
                    // Update the state with the input value
                    stateManager.setValues(variableName, value);
                }}
            />
        );
    }

    return (
        <ActionStepRunner
            actionStep={step} // Changed from step to actionStep to match props
            stateManager={stateManager}
            onStepUpdate={onStepUpdate}
        />
    );
};

export default StepDetail; 