import { WorkflowStep } from '../types';
import { SchemaManager } from '../hooks/schema/types';

interface ActionStepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    onStepUpdate: (step: WorkflowStep) => void;
}

const ActionStepContent: React.FC<ActionStepContentProps> = ({
    step,
    stateManager,
    onStepUpdate
}) => {
    return (
        <div className="space-y-6">
            {/* Tool Details */}
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Tool Details</h2>
                <div className="space-y-2">
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{step.tool?.name}</span>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description:</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{step.tool?.description}</span>
                    </div>
                </div>
            </div>

            {/* Current State */}
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Current State</h2>
                <div className="space-y-4">
                    {Object.entries(stateManager.values || {}).map(([key, value]) => (
                        <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                            <div className="flex items-start">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[150px]">
                                    {key}:
                                </span>
                                <div className="flex-1">
                                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                        {typeof value === 'object'
                                            ? JSON.stringify(value, null, 2)
                                            : String(value)
                                        }
                                    </pre>
                                </div>
                            </div>
                            <div className="mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                    Type: {stateManager.schemas[key]?.schema.type}
                                    {stateManager.schemas[key]?.role === 'input' && ' (input)'}
                                    {stateManager.schemas[key]?.role === 'output' && ' (output)'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {Object.keys(stateManager.values || {}).length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No state values yet
                        </div>
                    )}
                </div>
            </div>

            {/* Parameter Mappings */}
            {step.tool?.parameterMappings && Object.keys(step.tool.parameterMappings).length > 0 && (
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Parameter Mappings</h2>
                    <div className="space-y-2">
                        {Object.entries(step.tool.parameterMappings).map(([param, variable]) => (
                            <div key={param}>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{param}:</span>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{variable}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Output Mappings */}
            {step.tool?.outputMappings && Object.keys(step.tool.outputMappings).length > 0 && (
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Output Mappings</h2>
                    <div className="space-y-2">
                        {Object.entries(step.tool.outputMappings).map(([output, variable]) => (
                            <div key={output}>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{output}:</span>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{variable}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionStepContent; 