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