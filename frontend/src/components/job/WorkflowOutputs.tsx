import React from 'react';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';

export interface WorkflowOutputsProps {
    finalStepOutput: Record<WorkflowVariableName, SchemaValueType>;
    otherOutputs?: Array<{
        step_type: string;
        label: string;
        outputs: Record<string, SchemaValueType>;
    }>;
}

export const WorkflowOutputs: React.FC<WorkflowOutputsProps> = ({ finalStepOutput, otherOutputs = [] }) => {
    return (
        <div>
            {/* Final step outputs */}
            {Object.keys(finalStepOutput).length > 0 && (
                <div>
                    <h3>Final Outputs</h3>
                    <pre>{JSON.stringify(finalStepOutput, null, 2)}</pre>
                </div>
            )}

            {/* Other step outputs */}
            {otherOutputs.map((output, index) => (
                <div key={index}>
                    <h3>{output.label} Outputs</h3>
                    <pre>{JSON.stringify(output.outputs, null, 2)}</pre>
                </div>
            ))}
        </div>
    );
}; 