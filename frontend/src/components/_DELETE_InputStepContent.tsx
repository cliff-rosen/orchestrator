// This component appears to be a legacy/deprecated component for handling input steps
// in a workflow. Its functionality has likely been moved to InputStepRunner.tsx.

// The component takes props including:
// - step: The current input step configuration
// - onSubmit: Callback for when input is submitted
// - onBack: Callback for navigating back
// - loading: Boolean indicating if the step is processing

// Key functionality:
// 1. Renders a form based on the step's schema using SchemaForm
// 2. Handles form validation and submission
// 3. Provides navigation controls (back/submit buttons)
// 4. Shows loading state during processing

// This component has likely been replaced by InputStepRunner.tsx
// which probably provides similar functionality in a more modern/maintainable way

import React from 'react';
import { SchemaManager } from '../hooks/schema/types';
import SchemaForm from './SchemaForm';

interface InputStepContentProps {
    stateManager: SchemaManager;
}

const InputStepContent: React.FC<InputStepContentProps> = ({ stateManager, onComplete }) => {
    const inputSchemas = Object.entries(stateManager.schemas)
        .filter(([_, entry]) => entry.role === 'input')
        .map(([key, entry]) => ({
            key,
            schema: entry.schema,
            value: stateManager.getValue(key)
        }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Input Values
                </h2>
            </div>

            <div className="space-y-6">
                {inputSchemas.map(({ key, schema, value }) => (
                    <div key={key} className="space-y-2">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">
                            {schema.name}
                        </h3>
                        <SchemaForm
                            schema={schema}
                            value={value}
                            onChange={value => stateManager.setValues(key, value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InputStepContent; 