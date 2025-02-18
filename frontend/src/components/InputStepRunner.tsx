// Rename from InputStepContent.tsx
// This is for collecting input values in run mode 

import React from 'react';
import { useWorkflows } from '../context/WorkflowContext';
import SchemaForm from './SchemaForm';

const InputStepRunner: React.FC = () => {
    const { workflow, updateWorkflow } = useWorkflows();
    const inputs = workflow?.inputs || [];

    const handleInputChange = (input: string, value: any) => {
        if (!workflow) return;

        const updatedInputs = inputs.map(i => {
            if (i.schema.name === input) {
                return { ...i, value };
            }
            return i;
        });

        updateWorkflow({ inputs: updatedInputs });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Input Values
                </h2>
            </div>

            <div className="space-y-6">
                {inputs.map((input) => (
                    <div key={input.schema.name} className="space-y-2">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">
                            {input.schema.name}
                        </h3>
                        <SchemaForm
                            schema={input.schema}
                            value={input.value}
                            onChange={value => handleInputChange(input.schema.name, value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InputStepRunner; 