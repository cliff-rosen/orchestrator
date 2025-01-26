import React from 'react';
import { RuntimeWorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';

interface ActionStepContentProps {
    step: RuntimeWorkflowStep;
    stateManager: SchemaManager;
}

const ActionStepContent: React.FC<ActionStepContentProps> = ({
    step,
    stateManager
}) => {
    return (
        <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{step.label}</h2>
            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Tool: {step.tool?.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">{step.tool?.description}</p>
            </div>
            {step.tool?.signature && (
                <>
                    <div className="mb-4">
                        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Parameters:</h3>
                        <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                            {JSON.stringify(step.tool.signature.parameters, null, 2)}
                        </pre>
                    </div>
                    <div>
                        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Outputs:</h3>
                        <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                            {JSON.stringify(step.tool.signature.outputs, null, 2)}
                        </pre>
                    </div>
                </>
            )}
        </div>
    );
};

export default ActionStepContent; 