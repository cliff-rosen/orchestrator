import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow as WorkflowType, WorkflowStep, WorkflowVariable } from '../types';
import StepContent from './StepContent';
import { useSchemaDictionary } from '../hooks/schema';
import { SchemaManager } from '../hooks/schema/types';
import WorkflowConfig from './WorkflowConfig';
import InputStepContent from './InputStepContent';

interface RuntimeWorkflowStep extends WorkflowStep {
    action: (data?: any) => Promise<void>;
    actionButtonText: (state?: any) => string;
    isDisabled?: (state?: any) => boolean;
}

interface WorkflowProps {
    workflow: WorkflowType;
}

const Workflow: React.FC<WorkflowProps> = ({ workflow: initialWorkflow }) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [isEditMode, setIsEditMode] = useState(true);
    const [localWorkflow, setLocalWorkflow] = useState<WorkflowType | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const stateManager: SchemaManager = useSchemaDictionary();

    // Initialize local workflow and schemas
    useEffect(() => {
        console.log('initialWorkflow', initialWorkflow);
        if (!localWorkflow && initialWorkflow) {
            setLocalWorkflow(initialWorkflow);

            // Sync initial workflow variables with schema manager
            if (initialWorkflow.inputs?.length > 0) {
                initialWorkflow.inputs.forEach(input => {
                    stateManager.setSchema(input.name, input.schema, 'input');
                });
            }

            if (initialWorkflow.outputs?.length > 0) {
                initialWorkflow.outputs.forEach(output => {
                    stateManager.setSchema(output.name, output.schema, 'output');
                });
            }
        };
    }, [initialWorkflow, localWorkflow, stateManager]);

    const workflow = localWorkflow || initialWorkflow;

    // Redirect to home if workflow not found
    useEffect(() => {
        if (!workflow) {
            navigate('/');
        }
    }, [workflow, navigate]);

    if (!workflow) {
        return null;
    }

    const handleAddStep = () => {
        if (!localWorkflow) return;

        const newStep: WorkflowStep = {
            id: `step-${localWorkflow.steps.length + 1}`,
            label: `Step ${localWorkflow.steps.length + 1}`,
            description: 'New step description',
            stepType: 'ACTION'
        };

        setLocalWorkflow({
            ...localWorkflow,
            steps: [...localWorkflow.steps, newStep]
        });
        setActiveStep(workflowSteps.length);
    };

    const handleStepUpdate = (step: WorkflowStep) => {
        if (!localWorkflow) return;

        setLocalWorkflow({
            ...localWorkflow,
            steps: localWorkflow.steps.map(s => s.id === step.id ? step : s)
        });
    };

    const handleNext = async (): Promise<void> => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsLoading(false);
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = async (): Promise<void> => {
        setActiveStep((prev) => prev - 1);
    };

    const handleNewQuestion = async (): Promise<void> => {
        setActiveStep(0);
    };

    const handleStepClick = (index: number) => {
        if (isEditMode) {
            setActiveStep(index);
        }
    };

    const handleInputChange = (inputs: WorkflowVariable[]) => {
        if (!localWorkflow) return;

        // Update local workflow state
        setLocalWorkflow({
            ...localWorkflow,
            inputs
        });

        // Sync with schema manager
        const currentSchemas = stateManager.schemas;

        // Remove old schemas that are no longer in inputs
        Object.keys(currentSchemas)
            .filter(key => currentSchemas[key].role === 'input')
            .forEach(key => {
                if (!inputs.find(input => input.name === key)) {
                    stateManager.removeSchema(key);
                }
            });

        // Add/update new schemas
        inputs.forEach(input => {
            stateManager.setSchema(input.name, input.schema, 'input');
        });
    };

    const handleOutputChange = (outputs: WorkflowVariable[]) => {
        if (!localWorkflow) return;

        // Update local workflow state
        setLocalWorkflow({
            ...localWorkflow,
            outputs
        });

        // Sync with schema manager
        const currentSchemas = stateManager.schemas;

        // Remove old schemas that are no longer in outputs
        Object.keys(currentSchemas)
            .filter(key => currentSchemas[key].role === 'output')
            .forEach(key => {
                if (!outputs.find(output => output.name === key)) {
                    stateManager.removeSchema(key);
                }
            });

        // Add/update new schemas
        outputs.forEach(output => {
            stateManager.setSchema(output.name, output.schema, 'output');
        });
    };

    // Convert workflow steps to RuntimeWorkflowStep interface
    const workflowSteps: RuntimeWorkflowStep[] = workflow.steps.map(step => ({
        ...step,
        action: handleNext,
        actionButtonText: () => 'Next Step',
    }));

    // Add input step at the beginning when in run mode
    const allSteps = !isEditMode ? [
        {
            id: 'input-step',
            label: 'Input Values',
            description: 'Provide values for workflow inputs',
            stepType: 'INPUT' as const,
            action: handleNext,
            actionButtonText: () => 'Start Workflow',
        },
        ...workflowSteps
    ] : workflowSteps;

    return (
        <div className="flex flex-col h-full">
            {/* Menu Bar */}
            <div className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        {/* Back to Workflows Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Workflows
                        </button>
                        <span className="text-gray-600 dark:text-gray-300">
                            {workflow.name}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Config Toggle Button */}
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 
                                     dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                                     transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Configuration</span>
                        </button>

                        {/* Mode Toggle Button */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 
                                     transition-colors flex items-center space-x-2"
                        >
                            {isEditMode ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Run Workflow</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit Workflow</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                {/* Left Navigation */}
                <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
                    {/* Configuration Section */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors
                                ${showConfig
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                        >
                            <span className="font-medium">Configuration</span>
                            <svg
                                className={`w-5 h-5 transform transition-transform ${showConfig ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Steps List - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col gap-4">
                            {allSteps.map((step, index) => (
                                <div
                                    key={`${step.label}-${index}`}
                                    onClick={() => handleStepClick(index)}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isEditMode ? 'cursor-pointer' : ''}
                                        } ${index === activeStep
                                            ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-200'
                                            : index < activeStep && !isEditMode
                                                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-200'
                                                : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                                        }`}
                                >
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === activeStep
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                                        : index < activeStep && !isEditMode
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {!isEditMode && index === 0 ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            !isEditMode ? index : index + 1
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="font-medium">{step.label}</div>
                                        <div className="text-xs opacity-80">{step.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Step Button - Fixed at bottom */}
                    {isEditMode && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleAddStep}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 
                                         bg-gray-50 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300 
                                         hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400
                                         transition-colors text-sm font-medium"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                <span>Add Step</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    {showConfig ? (
                        <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6">
                            <WorkflowConfig
                                inputs={workflow.inputs}
                                outputs={workflow.outputs}
                                onInputChange={handleInputChange}
                                onOutputChange={handleOutputChange}
                            />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6">
                            {!isEditMode && activeStep === 0 ? (
                                <InputStepContent
                                    stateManager={stateManager}
                                    onComplete={handleNext}
                                />
                            ) : (
                                <StepContent
                                    step={allSteps[activeStep]}
                                    stateManager={stateManager}
                                    isEditMode={isEditMode}
                                    onStepUpdate={handleStepUpdate}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation - Only show in Run mode */}
            {!isEditMode && !showConfig && (
                <div className="fixed bottom-0 left-0 right-0 z-10">
                    <div className="max-w-7xl mx-auto px-6 py-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4 items-center">
                                <button
                                    className={`px-4 py-2 rounded-lg ${activeStep === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
                                        }`}
                                    onClick={handleBack}
                                    disabled={activeStep === 0}
                                >
                                    Back
                                </button>
                                {activeStep > 0 && (
                                    <button
                                        onClick={handleNewQuestion}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <span>New Question</span>
                                    </button>
                                )}
                            </div>

                            {/* Workflow-specific action button */}
                            {activeStep < allSteps.length && (
                                <button
                                    onClick={() => allSteps[activeStep].action()}
                                    disabled={isLoading || (allSteps[activeStep].isDisabled?.() ?? false)}
                                    className={`px-6 py-2 rounded-lg ${isLoading || (allSteps[activeStep].isDisabled?.() ?? false)
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isLoading ? 'Processing...' : allSteps[activeStep].actionButtonText()}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Workflow; 