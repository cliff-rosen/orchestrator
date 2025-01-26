// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React from 'react';
import { Tool } from '../types/tools';
import { SchemaManager } from '../hooks/schema/types';

interface ActionStepRunnerProps {
    tool?: Tool;
    parameterMappings: Record<string, string>;
    outputMappings: Record<string, string>;
    stateManager: SchemaManager;
}

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    tool,
    parameterMappings,
    outputMappings,
    stateManager,
}) => {
    if (!tool) {
        return <div className="text-gray-500">No tool selected</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">{tool.name}</h3>
                <p className="text-sm text-gray-500">{tool.description}</p>
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Parameters</h4>
                {Object.entries(parameterMappings).map(([paramName, varName]) => (
                    <div key={paramName} className="text-sm">
                        <span className="font-medium">{paramName}:</span> {varName}
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Outputs</h4>
                {Object.entries(outputMappings).map(([outputName, varName]) => (
                    <div key={outputName} className="text-sm">
                        <span className="font-medium">{outputName}:</span> {varName}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionStepRunner; 