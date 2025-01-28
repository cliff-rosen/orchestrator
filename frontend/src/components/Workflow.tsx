import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow as WorkflowType, WorkflowStep, WorkflowVariable, WorkflowStepType, RuntimeWorkflowStep, Tool } from '../types';
import { ResolvedParameters, ToolParameterName, ToolOutputName } from '../types/tools';
import { useSchemaDictionary } from '../hooks/schema';
import { SchemaManager } from '../hooks/schema/types';
import WorkflowConfig from './WorkflowConfig';
import { toolApi } from '../lib/api';
import StepDetail from './StepDetail';

interface WorkflowProps {
    workflow: WorkflowType;
}

const Workflow: React.FC<WorkflowProps> = ({ workflow: initialWorkflow }) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [localWorkflow, setLocalWorkflow] = useState<WorkflowType | null>(null);
    const [tools, setTools] = useState<Tool[]>([]);
    const stateManager: SchemaManager = useSchemaDictionary();
    const [stepExecuted, setStepExecuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);

    // Fetch available tools
    useEffect(() => {
        const fetchTools = async () => {
            try {
                const availableTools = await toolApi.getAvailableTools();
                setTools(availableTools);
            } catch (err) {
                console.error('Error fetching tools:', err);
                setError('Failed to load tools');
            }
        };

        fetchTools();
    }, []);

    // Initialize local workflow and schemas
    useEffect(() => {
        // console.log('localWorkflow', localWorkflow);
        // console.log('stateManager.schemas', stateManager.schemas);
        // console.log('stateManager.values', stateManager.values);
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

    // Reset stepExecuted when active step changes
    useEffect(() => {
        setStepExecuted(false);
    }, [activeStep]);

    if (!workflow) {
        return null;
    }

    const handleAddStep = () => {
        if (!localWorkflow) return;

        const newStep: WorkflowStep = {
            id: `step-${localWorkflow.steps.length + 1}`,
            label: `Step ${localWorkflow.steps.length + 1}`,
            description: 'New step description',
            stepType: WorkflowStepType.ACTION
        };

        setLocalWorkflow({
            ...localWorkflow,
            steps: [...localWorkflow.steps, newStep]
        });
        setActiveStep(workflowSteps.length);
    };

    const handleStepUpdate = (step: WorkflowStep | RuntimeWorkflowStep) => {
        console.log('handleStepUpdate', step);
        if (!localWorkflow) return;

        setLocalWorkflow({
            ...localWorkflow,
            steps: localWorkflow.steps.map(s => s.id === step.id ? step : s)
        });
    };

    const handleExecuteTool = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const currentStep = allSteps[activeStep];
            console.log('Executing step:', currentStep);

            if (currentStep.tool?.id) {
                // Get resolved parameters from state manager
                const resolvedParameters: ResolvedParameters = {};
                if (currentStep.parameterMappings) {
                    for (const [paramName, varName] of Object.entries(currentStep.parameterMappings)) {
                        const value = stateManager.getValue(varName);
                        console.log(`Resolving parameter ${paramName} from ${varName}:`, value);
                        resolvedParameters[paramName as ToolParameterName] = value;
                    }
                }

                // Add templateId for LLM tools
                if (currentStep.tool.type === 'llm') {
                    if (!currentStep.tool.promptTemplate) {
                        throw new Error('No prompt template selected for LLM tool');
                    }
                    resolvedParameters['templateId' as ToolParameterName] = currentStep.tool.promptTemplate;
                }

                console.log('Executing tool with parameters:', resolvedParameters);
                // Execute the tool
                const outputs = await toolApi.executeTool(currentStep.tool.id, resolvedParameters);
                console.log('Tool execution outputs:', outputs);

                // Store outputs in state manager
                if (currentStep.outputMappings) {
                    // First ensure the output variables are registered in the schema manager
                    for (const [outputName, varName] of Object.entries(currentStep.outputMappings)) {
                        const outputParam = currentStep.tool.signature.outputs.find(
                            p => p.name === outputName
                        );
                        if (outputParam) {
                            console.log(`Registering output schema for ${varName}:`, outputParam);
                            // Register the output schema if not already registered
                            stateManager.setSchema(varName, {
                                name: varName,
                                type: outputParam.type as any
                            }, 'output');
                        }
                    }

                    // Then set the values
                    for (const [outputName, varName] of Object.entries(currentStep.outputMappings)) {
                        const value = outputs[outputName as ToolOutputName];
                        console.log(`Setting output ${outputName} to ${varName}:`, value);
                        stateManager.setValues(varName, value);
                    }
                }
                setStepExecuted(true);
            }
        } catch (error) {
            console.error('Error executing step:', error);
            setError('Failed to execute step');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async (): Promise<void> => {
        setActiveStep((prev) => prev + 1);
        setStepExecuted(false);
    };

    const handleBack = async (): Promise<void> => {
        setActiveStep((prev) => prev - 1);
    };

    const handleNewQuestion = async (): Promise<void> => {
        // Clear all output values from state manager
        Object.keys(stateManager.schemas)
            .filter(key => stateManager.schemas[key].role === 'output')
            .forEach(key => {
                stateManager.setValues(key, undefined);
            });
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
        action: handleExecuteTool,
        actionButtonText: () => stepExecuted ? 'Next Step' : 'Execute Tool',
        isDisabled: () => step.stepType === WorkflowStepType.ACTION && stepExecuted,
    }));

    // Add input step at the beginning when in run mode
    const inputStep: RuntimeWorkflowStep = {
        id: 'input-step',
        label: 'Input Values',
        description: 'Provide values for workflow inputs',
        stepType: WorkflowStepType.INPUT,
        action: handleExecuteTool,
        actionButtonText: () => 'Next Step',
        isDisabled: () => false,
    };

    const allSteps = !isEditMode ? [inputStep, ...workflowSteps] : workflowSteps;

    // Get current step
    const currentStep = allSteps[activeStep];
    if (!currentStep) {
        // Reset to first step if current step doesn't exist
        setActiveStep(0);
        return null;
    }

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
                        {/* Schema Toggle Button */}
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors
                                ${showConfig
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Schema</span>
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

                    {/* Steps List - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col gap-4">
                            {allSteps.map((step, index) => (
                                <div
                                    key={`${step.label}-${index}`}
                                    onClick={() => handleStepClick(index)}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isEditMode ? 'cursor-pointer' : ''}
                                        } ${showConfig
                                            ? 'opacity-50 pointer-events-none'
                                            : index === activeStep
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
                <div className="container mx-auto px-4 py-6">
                    <div className="flex-1">
                        {showConfig ? (
                            <WorkflowConfig
                                inputs={workflow.inputs}
                                outputs={workflow.outputs}
                                onInputChange={handleInputChange}
                                onOutputChange={handleOutputChange}
                            />
                        ) : (
                            <>
                                {/* Step Detail */}
                                <div className="mt-4">
                                    <StepDetail
                                        step={allSteps[activeStep]}
                                        stateManager={stateManager}
                                        isEditMode={isEditMode}
                                        tools={tools}
                                        onStepUpdate={handleStepUpdate}
                                    />
                                </div>

                                {/* Navigation - Only show in run mode */}
                                {!isEditMode && (
                                    <div className="mt-4 flex justify-between">
                                        <button
                                            onClick={handleBack}
                                            disabled={activeStep === 0}
                                            className={`px-4 py-2 rounded-lg ${activeStep === 0
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            Back
                                        </button>
                                        <div className="flex gap-2">
                                            {currentStep.stepType === 'ACTION' && (
                                                <button
                                                    onClick={handleExecuteTool}
                                                    disabled={isLoading || stepExecuted}
                                                    className={`px-4 py-2 rounded-lg ${isLoading || stepExecuted
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {isLoading ? 'Processing...' : 'Execute Tool'}
                                                </button>
                                            )}
                                            {(currentStep.stepType === 'INPUT' || stepExecuted) && (
                                                activeStep === allSteps.length - 1 ? (
                                                    <button
                                                        onClick={handleNewQuestion}
                                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                                    >
                                                        Restart Flow
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleNext}
                                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                                    >
                                                        Next Step
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workflow; 