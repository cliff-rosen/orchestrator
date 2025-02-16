import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types
import { WorkflowStep, WorkflowStepType, RuntimeWorkflowStep } from '../types/workflows';
import { ResolvedParameters, ToolParameterName, ToolOutputName } from '../types/tools';

// Context
import { useWorkflows } from '../context/WorkflowContext';

// API
import { toolApi } from '../lib/api';
import { fileApi } from '../lib/api/fileApi';

// Page components
import WorkflowConfig from '../components/WorkflowConfig';
import WorkflowStepsList from '../components/WorkflowStepsList';
import StepDetail from '../components/StepDetail';
import WorkflowNavigation from '../components/WorkflowNavigation';
import WorkflowMenuBar from '../components/WorkflowMenuBar';

const Workflow: React.FC = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const {
        workflow,
        updateWorkflow,
        hasUnsavedChanges,
        loadWorkflow,
        isLoading,
        activeStep,
        setActiveStep
    } = useWorkflows();

    // State
    const [stepExecuted, setStepExecuted] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Initialize from localStorage, default to false if not set
        const saved = localStorage.getItem('workflowNavCollapsed');
        return saved ? JSON.parse(saved) : false;
    });


    // Initialize workflow based on URL parameter
    useEffect(() => {
        console.log('Workflow.tsx useEffect', workflowId);
        if (!workflowId) {
            navigate('/');
            return;
        }

        // Only load if we don't have this workflow or it's a different one
        if (!workflow || (workflow.workflow_id !== workflowId && workflowId !== 'new')) {
            const loadWorkflowData = async () => {
                try {
                    await loadWorkflow(workflowId);
                } catch (err) {
                    console.error('Error loading workflow:', err);
                    setError('Failed to load workflow');
                    navigate('/');
                }
            };
            loadWorkflowData();
        }
    }, [workflowId, navigate, loadWorkflow]);

    // Prompt user before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Reset stepExecuted when active step changes
    useEffect(() => {
        setStepExecuted(false);
    }, [activeStep]);

    // Save collapse state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('workflowNavCollapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    //////////////////////// Handlers ////////////////////////


    const handleAddStep = () => {
        if (!workflow) return;

        const newStep: WorkflowStep = {
            step_id: `step-${workflow.steps.length + 1}`,
            label: `Step ${workflow.steps.length + 1}`,
            description: 'Configure this step by selecting a tool and setting up its parameters',
            step_type: WorkflowStepType.ACTION,
            workflow_id: workflow.workflow_id,
            sequence_number: workflow.steps.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parameter_mappings: {},
            output_mappings: {},
        };

        updateWorkflow({
            steps: [...workflow.steps, newStep]
        });
        // Set the new step as active
        setActiveStep(workflow.steps.length);
    };

    const handleStepUpdate = (step: WorkflowStep | RuntimeWorkflowStep) => {
        console.log('handleStepUpdate called with step:', step);
        if (!workflow) return;

        // Find the existing step to preserve tool information
        const existingStep = workflow.steps.find(s => s.step_id === step.step_id);
        console.log('Existing step:', existingStep);

        // Preserve the tool object and ensure tool_id is set
        const updatedStep = {
            ...step,
            tool: step.tool || existingStep?.tool,  // Keep existing tool if not provided in update
            tool_id: step.tool?.tool_id || existingStep?.tool_id,
            parameter_mappings: {
                ...(existingStep?.parameter_mappings || {}),  // Keep existing mappings as base
                ...(step.parameter_mappings || {})  // Override with any new mappings
            },
            output_mappings: {
                ...(existingStep?.output_mappings || {}),  // Keep existing mappings as base
                ...(step.output_mappings || {})  // Override with any new mappings
            }
        };
        console.log('Updated step:', updatedStep);

        const updatedSteps = workflow.steps.map((s: WorkflowStep) =>
            s.step_id === step.step_id ? updatedStep : s
        );
        console.log('All steps after update:', updatedSteps);

        updateWorkflow({
            steps: updatedSteps
        });
    };

    const handleStepDelete = (stepId: string) => {
        if (!workflow) return;

        const stepIndex = workflow.steps.findIndex((s: WorkflowStep) => s.step_id === stepId);
        if (stepIndex === -1) return;

        // Update workflow with filtered steps
        updateWorkflow({
            steps: workflow.steps.filter((s: WorkflowStep) => s.step_id !== stepId)
        });

        // Adjust activeStep if needed
        if (stepIndex <= activeStep) {
            setActiveStep(Math.max(0, activeStep - 1));
        }
    };

    const handleExecuteTool = async (): Promise<void> => {
        console.log('handleExecuteTool called');
        try {
            setIsExecuting(true);
            const currentStep = allSteps[activeStep];
            console.log('Executing step:', currentStep);

            if (currentStep.tool?.tool_id) {
                const toolId = currentStep.tool.tool_id;
                let outputs;

                // Special handling for LLM tools
                if (currentStep.tool.tool_type === 'llm') {
                    if (!currentStep.prompt_template) {
                        throw new Error('No prompt template selected for LLM tool');
                    }

                    const regular_variables: Record<string, any> = {};
                    const file_variables: Record<string, string> = {};

                    if (currentStep.parameter_mappings) {
                        for (const [paramName, varName] of Object.entries(currentStep.parameter_mappings)) {
                            const variable = workflow?.inputs?.find(v => v.name === varName) ||
                                workflow?.outputs?.find(v => v.name === varName);

                            if (variable?.schema.type === 'file') {
                                const fileValue = variable.value;
                                if (fileValue?.file_id) {
                                    file_variables[paramName] = fileValue.file_id;
                                } else {
                                    console.warn(`File variable ${varName} has no file_id`);
                                }
                            } else {
                                regular_variables[paramName] = { value: variable?.value };
                            }
                        }
                    }

                    outputs = await toolApi.executeTool(toolId, {
                        prompt_template_id: currentStep.prompt_template,
                        regular_variables,
                        file_variables
                    });
                } else {
                    // For non-LLM tools, collect all parameters in a flat object
                    const parameters: Record<string, any> = {};

                    if (currentStep.parameter_mappings) {
                        for (const [paramName, varName] of Object.entries(currentStep.parameter_mappings)) {
                            const variable = workflow?.inputs?.find(v => v.name === varName) ||
                                workflow?.outputs?.find(v => v.name === varName);

                            if (variable?.schema.type === 'file') {
                                const fileValue = variable.value;
                                if (fileValue?.file_id) {
                                    parameters[paramName] = fileValue.file_id;
                                } else {
                                    console.warn(`File variable ${varName} has no file_id`);
                                }
                            } else {
                                parameters[paramName] = variable?.value;
                            }
                        }
                    }

                    outputs = await toolApi.executeTool(toolId, parameters);
                }

                console.log('Tool execution outputs:', outputs);

                // Store outputs in workflow variables
                if (currentStep.output_mappings) {
                    const updatedOutputs = [...(workflow?.outputs || [])];

                    for (const [outputName, varName] of Object.entries(currentStep.output_mappings)) {
                        const value = outputs[outputName as ToolOutputName];
                        // console.log(`Loading output ${outputName} into ${varName} with value`, value);

                        // Find and update the output variable
                        const outputVar = updatedOutputs.find(v => v.name === varName);
                        if (outputVar) {
                            outputVar.value = value;
                        }
                    }

                    // Update workflow with new output values
                    updateWorkflow({ outputs: updatedOutputs });
                }
                setStepExecuted(true);
            }
        } catch (error) {
            console.error('Error executing step:', error);
            setError('Failed to execute step');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleNext = async (): Promise<void> => {
        setActiveStep(activeStep + 1);
        setStepExecuted(false);
    };

    const handleBack = () => {
        setActiveStep(Math.max(0, activeStep - 1));
        setStepExecuted(false);
    };

    const handleNewQuestion = async (): Promise<void> => {
        // Clear all output values
        if (workflow?.outputs) {
            const clearedOutputs = workflow.outputs.map(output => ({
                ...output,
                value: undefined
            }));
            updateWorkflow({ outputs: clearedOutputs });
        }
        setActiveStep(0);
    };

    const handleStepClick = (index: number) => {
        if (isEditMode) {
            setActiveStep(index);
        }
    };

    const handleStepReorder = (reorderedSteps: RuntimeWorkflowStep[]) => {
        if (!workflow) return;

        // Update sequence numbers based on new order
        const updatedSteps = reorderedSteps.map((step, index) => ({
            ...step,
            sequence_number: index
        }));

        updateWorkflow({
            steps: updatedSteps
        });
    };

    ///////////////////////// Workflow preparation /////////////////////////

    if (!workflow) return null;
    // console.log('currentWorkflow', currentWorkflow);

    // Convert workflow steps to RuntimeWorkflowStep interface
    const workflowSteps: RuntimeWorkflowStep[] = workflow.steps.map((step: WorkflowStep) => {
        console.log('Converting workflow step to runtime step:', {
            step_id: step.step_id,
            tool: step.tool,
            parameter_mappings: step.parameter_mappings
        });
        const runtimeStep = {
            ...step,
            action: handleExecuteTool,
            actionButtonText: () => stepExecuted ? 'Next Step' : 'Execute Tool',
            isDisabled: () => step.step_type === WorkflowStepType.ACTION && stepExecuted,
        };
        console.log('Resulting runtime step:', {
            step_id: runtimeStep.step_id,
            tool: runtimeStep.tool,
            parameter_mappings: runtimeStep.parameter_mappings
        });
        return runtimeStep;
    });

    // Add input step at the beginning when in run mode
    const inputStep: RuntimeWorkflowStep = {
        step_id: 'input-step',
        label: 'Input Values',
        description: 'Provide values for workflow inputs',
        step_type: WorkflowStepType.INPUT,
        workflow_id: workflow.workflow_id,
        sequence_number: -1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parameter_mappings: {},
        output_mappings: {},
        action: handleExecuteTool,
        actionButtonText: () => 'Next Step',
        isDisabled: () => false,
    };

    const allSteps = !isEditMode ? [inputStep, ...workflowSteps] : workflowSteps;
    console.log('All prepared steps:', allSteps.map(step => ({
        step_id: step.step_id,
        tool: step.tool,
        parameter_mappings: step.parameter_mappings
    })));

    // Get current step
    const currentStep = allSteps[activeStep];
    console.log('Current step being passed to StepDetail:', {
        step_id: currentStep?.step_id,
        tool: currentStep?.tool,
        parameter_mappings: currentStep?.parameter_mappings
    });

    // Effect to handle invalid active step
    useEffect(() => {
        if (!currentStep && allSteps.length > 0) {
            setActiveStep(0);
        }
    }, [currentStep, allSteps.length, setActiveStep]);

    ///////////////////////// Render /////////////////////////

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <WorkflowMenuBar
                    isEditMode={isEditMode}
                    onToggleEditMode={() => {
                        const newIsEditMode = !isEditMode;
                        if (newIsEditMode) {
                            // When switching to edit mode, keep the same step index but adjust for input step offset
                            const editModeIndex = activeStep > 0 ? activeStep - 1 : 0;
                            setActiveStep(editModeIndex);
                        } else {
                            // When switching to run mode
                            // Check if any inputs are not supplied
                            const hasUnsetInputs = workflow?.inputs?.some(input =>
                                input.value === undefined || input.value === null
                            );

                            if (hasUnsetInputs) {
                                // Go to input step if any inputs need values
                                setActiveStep(0);
                            } else {
                                // Stay on current step but adjust index for input step
                                setActiveStep(activeStep + 1);
                            }
                        }
                        setIsEditMode(newIsEditMode);
                    }}
                />
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workflow...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <WorkflowMenuBar
                isEditMode={isEditMode}
                onToggleEditMode={() => {
                    const newIsEditMode = !isEditMode;
                    if (newIsEditMode) {
                        // When switching to edit mode, keep the same step index but adjust for input step offset
                        const editModeIndex = activeStep > 0 ? activeStep - 1 : 0;
                        setActiveStep(editModeIndex);
                    } else {
                        // When switching to run mode
                        // Check if any inputs are not supplied
                        const hasUnsetInputs = workflow?.inputs?.some(input =>
                            input.value === undefined || input.value === null
                        );

                        if (hasUnsetInputs) {
                            // Go to input step if any inputs need values
                            setActiveStep(0);
                        } else {
                            // Stay on current step but adjust index for input step
                            setActiveStep(activeStep + 1);
                        }
                    }
                    setIsEditMode(newIsEditMode);
                }}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                {/* Left Navigation */}
                <div className={`${isCollapsed ? 'w-16' : 'w-80'} flex flex-col bg-white dark:bg-gray-800/50 transition-all duration-300 relative`}>
                    {/* Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="absolute -right-3 top-14 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 z-10"
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg
                            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Config Section */}
                    <div className={`${isCollapsed ? 'hidden' : ''}`}>
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                                    ${showConfig
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-700/10 dark:ring-blue-400/10'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h4" />
                                </svg>
                                <span>Workflow Variables</span>
                                <svg
                                    className={`w-4 h-4 ml-auto transition-transform ${showConfig ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Collapsed View */}
                    {isCollapsed && (
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="p-2">
                                <button
                                    onClick={() => setShowConfig(!showConfig)}
                                    className={`w-full flex justify-center p-2 rounded-md transition-colors
                                        ${showConfig
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-700/10 dark:ring-blue-400/10'
                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400'
                                        }`}
                                    title="Workflow Variables"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Show Steps List when not in config mode */}
                    {!showConfig && (
                        <WorkflowStepsList
                            steps={allSteps}
                            activeStep={activeStep}
                            isEditMode={isEditMode}
                            onStepClick={handleStepClick}
                            onAddStep={handleAddStep}
                            onReorder={handleStepReorder}
                            isCollapsed={isCollapsed}
                        />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex-1">
                            {showConfig ? (
                                <WorkflowConfig />
                            ) : (
                                <>
                                    {/* Step Detail */}
                                    <div className="mt-4">
                                        {currentStep ? (
                                            <StepDetail
                                                step={allSteps[activeStep]}
                                                isEditMode={isEditMode}
                                                stepExecuted={stepExecuted}
                                                isExecuting={isExecuting}
                                                onStepUpdate={handleStepUpdate}
                                                onStepDelete={handleStepDelete}
                                            />
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    No steps in this workflow yet. Click the "Add Step" button to get started.
                                                </p>
                                                <button
                                                    onClick={handleAddStep}
                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                >
                                                    Add First Step
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {currentStep && (
                                        <WorkflowNavigation
                                            isEditMode={isEditMode}
                                            activeStep={activeStep}
                                            totalSteps={allSteps.length}
                                            step_type={currentStep?.step_type as WorkflowStepType || WorkflowStepType.ACTION}
                                            isLoading={isLoading || isExecuting}
                                            stepExecuted={stepExecuted}
                                            onBack={handleBack}
                                            onNext={handleNext}
                                            onExecute={handleExecuteTool}
                                            onRestart={handleNewQuestion}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workflow; 