import React from 'react';
import { WorkflowStep } from '../data';
import { SchemaManager } from '../hooks/schema/types';
import SchemaEditor from './SchemaEditor';
import SchemaForm from './SchemaForm';

interface StepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
}

const StepContent: React.FC<StepContentProps> = ({ step, stateManager, isEditMode }) => {
    if (step.stepType === 'INPUT') {
        if (isEditMode) {
            return <SchemaEditor stateManager={stateManager} />;
        } else {
            return (
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
        }
    }

    return (
        <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {step.label}
            </h2>
            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Step Type: {step.stepType}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
            </div>
            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Current Schema State:
                </h3>
                <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded 
                              border border-gray-200 dark:border-gray-700 
                              text-gray-800 dark:text-gray-200">
                    {JSON.stringify(stateManager.schemas, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default StepContent; 