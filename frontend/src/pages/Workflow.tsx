import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types
import {
    WorkflowStep,
    WorkflowStepType,
    RuntimeWorkflowStep,
    WorkflowStepId,
    WorkflowVariableName,
    StepExecutionResult
} from '../types/workflows';
import {
    ToolOutputName
} from '../types/tools';
import { SchemaValueType } from '../types/schema';

// Engines
import { ToolEngine } from '../lib/tool/toolEngine';
import { WorkflowEngine } from '../lib/workflow/workflowEngine';

// Context
import { useWorkflows } from '../context/WorkflowContext';

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

    const handleExecuteCurrentStep = async (): Promise<StepExecutionResult> => {
        if (!workflow) {
            return {
                success: false,
                error: 'No workflow loaded'
            };
        }

        try {
            setIsExecuting(true);
            console.log('Executing current step');

            // Execute step using WorkflowEngine - all state management handled internally
            const result = await WorkflowEngine.executeCurrentStep();

            // Only track UI execution state
            setStepExecuted(true);
            return result;
        } catch (error) {
            console.error('Error executing step:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsExecuting(false);
        }
    };

    // Memoize the createRuntimeStep function
    const createRuntimeStep = useCallback((step: WorkflowStep, index: number): RuntimeWorkflowStep => {
        return {
            ...step,
            action: async () => {
                if (index === activeStep) {
                    return handleExecuteCurrentStep();
                }
                return {
                    success: false,
                    error: 'Step is not active'
                };
            },
            actionButtonText: () => {
                if (index === activeStep) {
                    return stepExecuted ? 'Next Step' : 'Execute Tool';
                }
                return 'Execute Tool';
            },
            isDisabled: () => {
                return index !== activeStep || isExecuting;
            },
            getValidationErrors: () => {
                const errors: string[] = [];

                if (!step.tool) {
                    errors.push('No tool selected');
                }

                if (step.tool?.tool_type === 'llm' && !step.prompt_template_id) {
                    errors.push('No prompt template selected');
                }

                // Check parameter mappings
                if (step.parameter_mappings) {
                    for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
                        const variable = workflow?.inputs?.find(v => v.name === varName) ||
                            workflow?.outputs?.find(v => v.name === varName);

                        if (!variable) {
                            errors.push(`Missing variable mapping for parameter: ${paramName}`);
                        }
                    }
                }

                return errors;
            }
        };
    }, [activeStep, stepExecuted, isExecuting, workflow, handleExecuteCurrentStep]);

    // Memoize the workflow steps
    const workflowSteps = useMemo(() => {
        if (!workflow) return [];

        return workflow.steps.map((step, index) => {
            // In edit mode, provide dummy runtime properties
            if (isEditMode) {
                return {
                    ...step,
                    action: async () => ({ success: false, error: 'Not executable in edit mode' }),
                    actionButtonText: () => 'Edit',
                    isDisabled: () => true,
                    getValidationErrors: () => []
                } as RuntimeWorkflowStep;
            }

            // In run mode, create full runtime step
            console.log('Converting workflow step to runtime step:', {
                step_id: step.step_id,
                tool: step.tool,
                parameter_mappings: step.parameter_mappings
            });
            const runtimeStep = createRuntimeStep(step, index);
            console.log('Resulting runtime step:', {
                step_id: runtimeStep.step_id,
                tool: runtimeStep.tool,
                parameter_mappings: runtimeStep.parameter_mappings
            });
            return runtimeStep;
        });
    }, [workflow, createRuntimeStep, isEditMode]);

    // Memoize the input step (only needed in run mode)
    const inputStep = useMemo(() => {
        if (!workflow || isEditMode) return null;

        return {
            step_id: `input-step-${workflow.workflow_id}` as WorkflowStepId,
            label: 'Input Values',
            description: 'Provide values for workflow inputs',
            step_type: WorkflowStepType.INPUT,
            workflow_id: workflow.workflow_id,
            sequence_number: -1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parameter_mappings: {},
            output_mappings: {},
            action: handleExecuteCurrentStep,
            actionButtonText: () => 'Next Step',
            isDisabled: () => false,
            getValidationErrors: () => []
        } as RuntimeWorkflowStep;
    }, [workflow, isEditMode, handleExecuteCurrentStep]);

    // Memoize all steps
    const allSteps = useMemo(() => {
        if (!workflowSteps) return [];
        return !isEditMode && inputStep ? [inputStep, ...workflowSteps] : workflowSteps;
    }, [isEditMode, inputStep, workflowSteps]);

    // Memoize current step
    const currentStep = useMemo(() => {
        return allSteps[activeStep];
    }, [allSteps, activeStep]);

    // Effect to handle invalid active step
    useEffect(() => {
        if (!currentStep && allSteps.length > 0) {
            setActiveStep(0);
        }
    }, [currentStep, allSteps.length, setActiveStep]);

    // Effect to log step changes
    useEffect(() => {
        console.log('All prepared steps:', allSteps.map(step => ({
            step_id: step.step_id,
            tool: step.tool,
            parameter_mappings: step.parameter_mappings
        })));

        console.log('Current step being passed to StepDetail:', currentStep && {
            step_id: currentStep.step_id,
            tool: currentStep.tool,
            parameter_mappings: currentStep.parameter_mappings
        });
    }, [allSteps, currentStep]);

    const handleStepReorder = (reorderedSteps: RuntimeWorkflowStep[]) => {
        if (!workflow) return;

        // Convert runtime steps back to workflow steps while preserving sequence numbers
        const updatedSteps: WorkflowStep[] = reorderedSteps.map((step, index) => {
            // Extract only the WorkflowStep properties
            const {
                action,
                actionButtonText,
                isDisabled,
                getValidationErrors,
                ...workflowStep
            } = step;

            return {
                ...workflowStep,
                sequence_number: index,
                updated_at: new Date().toISOString()
            };
        });

        updateWorkflow({
            steps: updatedSteps
        });
    };

    const handleAddStep = () => {
        if (!workflow) return;

        // Create a branded WorkflowStepId using crypto.randomUUID()
        const stepId = `step-${crypto.randomUUID()}`;
        const newStep: WorkflowStep = {
            step_id: stepId as WorkflowStepId,
            label: `Step ${workflow.steps.length + 1}`,
            description: 'Configure this step by selecting a tool and setting up its parameters',
            step_type: WorkflowStepType.ACTION,
            workflow_id: workflow.workflow_id,
            sequence_number: workflow.steps.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parameter_mappings: {},
            output_mappings: {},
            tool: undefined,
            tool_id: undefined,
            prompt_template_id: undefined
        };

        const updatedSteps = [...workflow.steps, newStep];
        updateWorkflow({
            steps: updatedSteps
        });
        // Set the new step as active
        setActiveStep(updatedSteps.length - 1);
    };

    const handleStepUpdate = (step: WorkflowStep | RuntimeWorkflowStep) => {
        console.log('handleStepUpdate called with step:', step);
        if (!workflow) return;

        // Find the existing step to preserve tool information
        const existingStep = workflow.steps.find(s => s.step_id === step.step_id);
        console.log('Existing step:', existingStep);

        // Create updated step, properly handling tool clearing and evaluation config
        const updatedStep = {
            ...step,
            // Only preserve tool and tool_id if they weren't explicitly set to undefined
            tool: 'tool' in step ? step.tool : existingStep?.tool,
            tool_id: 'tool_id' in step ? step.tool_id : existingStep?.tool_id,
            // Only preserve prompt_template_id if the tool hasn't changed
            prompt_template_id: step.tool?.tool_id === existingStep?.tool_id ?
                (step.prompt_template_id ?? existingStep?.prompt_template_id) :
                step.prompt_template_id,
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

    const handleNext = async (): Promise<void> => {
        // For evaluation steps, check if we need to jump to a specific step
        if (currentStep?.step_type === WorkflowStepType.EVALUATION) {
            const evalResult = workflow?.outputs?.find(o => o.name === `${currentStep.step_id}_result`)?.value as Record<string, string> | undefined;
            if (evalResult?.action === 'jump' && evalResult?.target_step_index) {
                // Convert target_step_index from string to number and adjust for input step offset
                const targetStep = !isEditMode ? parseInt(evalResult.target_step_index) + 1 : parseInt(evalResult.target_step_index);
                setActiveStep(targetStep);
            } else {
                // Default behavior - go to next step
                setActiveStep(activeStep + 1);
            }
        } else {
            // For non-evaluation steps, just go to next step
            setActiveStep(activeStep + 1);
        }
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

    ///////////////////////// Workflow preparation /////////////////////////

    if (!workflow) return null;
    // console.log('currentWorkflow', currentWorkflow);

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
                            onStepDelete={handleStepDelete}
                            isCollapsed={isCollapsed}
                        />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex-1 space-y-6">
                            {showConfig ? (
                                <WorkflowConfig />
                            ) : (
                                <>
                                    {/* Step Detail */}
                                    <div>
                                        {currentStep ? (
                                            <StepDetail
                                                step={currentStep}
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
                                            onExecute={handleExecuteCurrentStep}
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