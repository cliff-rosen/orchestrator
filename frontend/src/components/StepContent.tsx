import React from 'react';
import { WorkflowStep } from '../data';
import { SchemaManager } from '../hooks/schema/types';
import SchemaEditor from '../components/SchemaEditor';

interface StepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
}

const StepContent: React.FC<StepContentProps> = ({ step, stateManager, isEditMode }) => {
    if (step.stepType === 'INPUT' && isEditMode) {
        return <SchemaEditor stateManager={stateManager} />;
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
                <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    {JSON.stringify(stateManager.state, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default StepContent; 