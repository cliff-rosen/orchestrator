import React from 'react';
import { WorkflowStep, Tool, ToolType } from '../data';
import { SchemaManager } from '../hooks/schema/types';
import SchemaEditor from './SchemaEditor';
import SchemaForm from './SchemaForm';

interface StepContentProps {
    step: WorkflowStep;
    stateManager: SchemaManager;
    isEditMode: boolean;
    onStepUpdate: (step: WorkflowStep) => void;
}

const TOOL_TYPES: ToolType[] = ['llm', 'search', 'retrieve'];

const ActionEditor: React.FC<{
    step: WorkflowStep,
    stateManager: SchemaManager,
    onStepUpdate: (step: WorkflowStep) => void
}> = ({ step, stateManager, onStepUpdate }) => {
    const handleToolChange = (type: ToolType) => {
        const newTool: Tool = {
            type,
            name: `${type.toUpperCase()} Tool`,
            description: `Default ${type} tool configuration`
        };
        onStepUpdate({
            ...step,
            tool: newTool
        });
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                {step.label}
            </h2>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tool Type
                </label>
                <select
                    value={step.tool?.type || ''}
                    onChange={(e) => handleToolChange(e.target.value as ToolType)}
                    className="w-full px-3 py-2 
                             border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-gray-100
                             rounded-md"
                >
                    <option value="" disabled>Select a tool</option>
                    {TOOL_TYPES.map(toolType => (
                        <option key={toolType} value={toolType}>
                            {toolType.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Step Type: {step.stepType}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
            </div>
        </div>
    );
};

const InputStepContent: React.FC<{ stateManager: SchemaManager }> = ({ stateManager }) => (
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

const ActionStepContent: React.FC<{ step: WorkflowStep, stateManager: SchemaManager }> = ({ step, stateManager }) => (
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

        {step.tool && (
            <div className="mb-4">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Tool Configuration
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded 
                              border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Type:
                            </span>
                            <p className="text-gray-900 dark:text-gray-100">
                                {step.tool.type.toUpperCase()}
                            </p>
                        </div>
                        {step.tool.name && (
                            <div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Name:
                                </span>
                                <p className="text-gray-900 dark:text-gray-100">
                                    {step.tool.name}
                                </p>
                            </div>
                        )}
                    </div>
                    {step.tool.description && (
                        <div className="mt-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Description:
                            </span>
                            <p className="text-gray-900 dark:text-gray-100">
                                {step.tool.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="mb-4">
            <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                Current Schema State:
            </h3>
            <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded 
                          border border-gray-200 dark:border-gray-700 
                          text-gray-800 dark:text-gray-200">
                {JSON.stringify(stateManager.values, null, 2)}
            </pre>
        </div>
    </div>
);

const StepContent: React.FC<StepContentProps> = ({
    step,
    stateManager,
    isEditMode,
    onStepUpdate
}) => {
    const isInputStep = step.stepType === 'INPUT';

    if (isEditMode) {
        if (isInputStep) {
            return <SchemaEditor stateManager={stateManager} />;
        } else {
            return <ActionEditor
                step={step}
                stateManager={stateManager}
                onStepUpdate={onStepUpdate}
            />;
        }
    }

    if (isInputStep) {
        return <InputStepContent stateManager={stateManager} />;
    } else {
        return <ActionStepContent step={step} stateManager={stateManager} />;
    }
};

export default StepContent; 