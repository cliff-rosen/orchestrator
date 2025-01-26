// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React from 'react';
import { Tool } from '../types/tools';
import { SchemaManager } from '../hooks/schema/types';
import { RuntimeWorkflowStep } from '../types/workflows';

interface ActionStepRunnerProps {
    actionStep: RuntimeWorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: RuntimeWorkflowStep) => void;
}

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    stateManager,
    onStepUpdate,
}) => {
    if (!actionStep.tool) {
        return <div className="text-gray-500">No tool selected</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">{actionStep.tool.name}</h3>
                <p className="text-sm text-gray-500">{actionStep.tool.description}</p>
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Parameters</h4>
                {actionStep.parameters && Object.entries(actionStep.parameters).map(([paramName, varName]) => (
                    <div key={paramName} className="text-sm">
                        <span className="font-medium">{paramName}:</span>{' '}
                        <span>{String(varName)}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Outputs</h4>
                {actionStep.outputs && Object.entries(actionStep.outputs).map(([outputName, varName]) => (
                    <div key={outputName} className="text-sm">
                        <span className="font-medium">{outputName}:</span>{' '}
                        <span>{String(varName)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionStepRunner; 