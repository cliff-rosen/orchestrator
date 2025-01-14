import React from 'react';
import { SchemaManager } from '../hooks/schema/types';
import SchemaForm from './SchemaForm';

interface InputStepContentProps {
    stateManager: SchemaManager;
}

const InputStepContent: React.FC<InputStepContentProps> = ({ stateManager }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Input Values
        </h2>
        {stateManager.schemas && Object.entries(stateManager.schemas)
            .filter(([_, entry]) => entry.role === 'input')
            .map(([key, entry]) => (
                <div key={key} className="space-y-2">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">
                        {key}
                    </h3>
                    <SchemaForm
                        schema={entry.schema}
                        value={stateManager.getValue(key)}
                        onChange={value => stateManager.setValues(key, value)}
                    />
                </div>
            ))}
    </div>
);

export default InputStepContent; 