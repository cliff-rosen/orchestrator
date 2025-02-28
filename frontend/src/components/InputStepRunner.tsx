// Rename from InputStepContent.tsx
// This is for collecting input values in run mode 

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkflows } from '../context/WorkflowContext';
import SchemaForm from './SchemaForm';
import { WorkflowVariable } from '@/types/workflows';
import { Schema, SchemaValueType } from '@/types/schema';
import Dialog from './common/Dialog';
import { Button } from './ui/button';

interface InputStepRunnerProps {
    isOpen: boolean;
    onClose: () => void;
    onContinue: () => void;
}

const InputStepRunner: React.FC<InputStepRunnerProps> = ({
    isOpen,
    onClose,
    onContinue
}) => {
    const { workflow, activeStep, updateWorkflowByAction } = useWorkflows();
    const allInputs = workflow?.state || [];
    const containerRef = useRef<HTMLDivElement>(null);

    // State to keep track of required inputs for the current step
    const [requiredInputs, setRequiredInputs] = useState<string[]>([]);

    // useEffect to find all inputs required for the current step
    useEffect(() => {
        if (!workflow?.steps[activeStep]?.parameter_mappings) return;

        const paramMappings = workflow.steps[activeStep].parameter_mappings;
        // Get input variable names directly from parameter mappings
        const requiredInputNames = Object.values(paramMappings)
            .filter(mapping => typeof mapping === 'string')
            .map(mapping => mapping as string);

        setRequiredInputs(requiredInputNames);
        console.log('requiredInputs for current step:', requiredInputNames);
    }, [workflow, activeStep]);

    // Focus the first input when the modal is shown
    useEffect(() => {
        if (!isOpen) return;

        // Give a longer timeout to ensure DOM is fully rendered
        const focusTimer = setTimeout(() => {
            if (containerRef.current) {
                // Find the first input element within the container
                const firstInput = containerRef.current.querySelector('input, textarea, select') as HTMLElement;
                if (firstInput) {
                    firstInput.focus();
                    console.log('Input focused:', firstInput);
                }
            }
        }, 250); // Longer delay to ensure the DOM is fully updated

        return () => clearTimeout(focusTimer);
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.target instanceof HTMLInputElement && e.target.type !== 'textarea') {
                e.preventDefault();
                onContinue();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [onContinue, onClose]);

    // Helper function to get default value based on schema type
    const getDefaultValue = (schema: Schema): SchemaValueType => {
        if (schema.type === 'string') return '';
        if (schema.type === 'number') return 0;
        if (schema.type === 'boolean') return false;
        if (schema.type === 'file') return { file_id: '', name: '', content: new Uint8Array(), mime_type: '', size: 0, created_at: '', updated_at: '' };
        if (schema.type === 'object') {
            const result: Record<string, SchemaValueType> = {};
            if (schema.fields) {
                for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                    result[key] = getDefaultValue(fieldSchema);
                }
            }
            return result;
        }
        return '';
    };

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

    // Filter inputs to only show those required for the current step
    const stepInputs = allInputs.filter(input => requiredInputs.includes(input.name));

    // Get current step name for the title
    const currentStepName = workflow?.steps[activeStep]?.label || `Step ${activeStep + 1}`;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={`Start ${currentStepName}`} maxWidth="2xl">
            <div className="space-y-6" ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300">
                        Ready to Begin
                    </h2>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Please provide the following inputs to start {currentStepName}.
                    </p>
                </div>

                {stepInputs.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-gray-500 dark:text-gray-400">
                            No inputs required for this step. You can continue.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {stepInputs.map((input, index) => (
                            <div key={input.name} className="space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-800 dark:text-gray-200">
                                    {input.name}
                                </h3>
                                {input.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {input.description}
                                    </p>
                                )}
                                <SchemaForm
                                    schema={input.schema}
                                    value={input.value ?? getDefaultValue(input.schema)}
                                    onChange={value => handleInputChange(input.name, value)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onContinue}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Continue to Run
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

export default InputStepRunner; 