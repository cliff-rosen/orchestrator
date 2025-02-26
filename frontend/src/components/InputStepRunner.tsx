// Rename from InputStepContent.tsx
// This is for collecting input values in run mode 

import React from 'react';
import { useWorkflows } from '../context/WorkflowContext';
import SchemaForm from './SchemaForm';
import { WorkflowVariable } from '@/types/workflows';

const InputStepRunner: React.FC = () => {
    const { workflow, updateWorkflowByAction } = useWorkflows();
    const inputs = workflow?.state?.filter(variable => variable.io_type === 'input') || [];

    const handleInputChange = (input: string, value: any) => {
        console.log('handleInputChange', input, value);
        if (!workflow) return;

        const updatedInputs = workflow.state?.map((i: WorkflowVariable) => {
            if (i.name === input) {
                return { ...i, value };
            }
            return i;
        }) || [];

        updateWorkflowByAction({
            type: 'UPDATE_STATE',
            payload: {
                state: updatedInputs
            }
        });
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
                    <div key={input.name} className="space-y-2">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">
                            {input.name}
                        </h3>
                        <SchemaForm
                            schema={input.schema}
                            value={input.value}
                            onChange={value => handleInputChange(input.name, value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InputStepRunner; 