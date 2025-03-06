import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types
import {
    WorkflowStep,
    WorkflowStepType
} from '../types/workflows';

// Context
import { useWorkflows } from '../context/WorkflowContext';

// Page components
import WorkflowConfig from '../components/WorkflowConfig';
import WorkflowStepsList from '../components/WorkflowStepsList';
import StepDetail from '../components/StepDetail';
import WorkflowNavigation from '../components/WorkflowNavigation';
import WorkflowMenuBar from '../components/WorkflowMenuBar';
import InputStepRunner from '../components/InputStepRunner';


const Workflow: React.FC = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const {
        workflow,
        activeStep,
        stepExecuted,
        stepRequestsInput,
        hasUnsavedChanges,
        isLoading,
        isExecuting,
        loadWorkflow,
        setActiveStep,
        setStepRequestsInput,
        executeCurrentStep,
        setStepExecuted,
        moveToNextStep,
        moveToPreviousStep,
        updateWorkflowByAction,
        updateWorkflowStep,
        resetWorkflow,
        resetWorkflowState,
    } = useWorkflows();

    // State
    const [showConfig, setShowConfig] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Initialize from localStorage, default to false if not set
        const saved = localStorage.getItem('workflowNavCollapsed');
        return saved ? JSON.parse(saved) : false;
    });
    // State for input modal
    const [showInputModal, setShowInputModal] = useState(false);

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

    // Save collapse state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('workflowNavCollapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    // When input is requested, show the input modal
    useEffect(() => {
        if (stepRequestsInput) {
            setShowInputModal(true);
        }
    }, [stepRequestsInput]);

    // Memoize the workflow steps
    const workflowSteps = useMemo(() => {
        if (!workflow) return [];

        // Just return the raw workflow steps - runtime operations are now handled by utility functions
        return workflow.steps;
    }, [workflow]);

    // Memoize current step
    const currentStep = useMemo(() => {
        return workflowSteps[activeStep];
    }, [workflowSteps, activeStep]);

    // Effect to handle invalid active step
    useEffect(() => {
        if (!currentStep && workflowSteps?.length && workflowSteps?.length > 0) {
            setActiveStep(0);
        }
    }, [currentStep, workflowSteps?.length, setActiveStep]);

    // Effect to log step changes
    // useEffect(() => {
    //     console.log('All prepared steps:', workflowSteps.map(step => ({
    //         step_id: step.step_id,
    //         tool: step.tool,
    //         parameter_mappings: step.parameter_mappings
    //     })));

    //     console.log('Current step being passed to StepDetail:', currentStep && {
    //         step_id: currentStep.step_id,
    //         tool: currentStep.tool,
    //         parameter_mappings: currentStep.parameter_mappings
    //     });
    // }, [workflowSteps, currentStep]);

    //////////////////////// Handlers ////////////////////////

    const handleStepReorder = (reorderedSteps: WorkflowStep[]) => {
        if (!workflow) return;

        updateWorkflowByAction({
            type: 'REORDER_STEPS',
            payload: {
                reorder: {
                    reorderedSteps: reorderedSteps
                }
            }
        });
    };

    const handleAddStep = () => {
        if (!workflow) return;

        updateWorkflowByAction({
            type: 'ADD_STEP',
            payload: {}
        });
    };

    const handleStepUpdate = (step: WorkflowStep) => {
        console.log('handleStepUpdate called with step:', step);
        updateWorkflowStep(step);
    };

    const handleStepDelete = (stepId: string) => {
        if (!workflow) return;

        updateWorkflowByAction({
            type: 'DELETE_STEP',
            payload: {
                stepId
            }
        });
    };

    const handleNext = async (): Promise<void> => {
        moveToNextStep();
    };

    const handleBack = () => {
        moveToPreviousStep();
    };

    const handleStepClick = (index: number) => {
        if (isEditMode) {
            setActiveStep(index);
        }
    };

    const handleToggleEditMode = () => {
        if (isEditMode) {
            // When switching to run mode, show the input modal
            // Reset workflow state but keep the active step
            resetWorkflowState();
            setShowInputModal(true);
            setStepRequestsInput(true);
        } else {
            setStepRequestsInput(false);
        }

        setIsEditMode(!isEditMode);
        setStepExecuted(false);
    }

    const handleNewQuestion = async (): Promise<void> => {
        resetWorkflow();
        setStepRequestsInput(true);
        setStepExecuted(false);
    };

    const handleExecute = () => {
        setStepRequestsInput(false);
        executeCurrentStep();
    }

    const handleInputSubmit = () => {
        setShowInputModal(false);
        setStepRequestsInput(false);
    }

    const handleInputCancel = () => {
        console.log('Input modal canceled - switching back to edit mode');
        setShowInputModal(false);
        // Switch back to edit mode if canceling inputs
        setIsEditMode(true);
        setStepRequestsInput(false);

    }

    ///////////////////////// Workflow preparation /////////////////////////

    if (!workflow) return null;
    // console.log('currentWorkflow', currentWorkflow);

    ///////////////////////// Render /////////////////////////

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <WorkflowMenuBar
                    isEditMode={isEditMode}
                    onToggleEditMode={handleToggleEditMode}
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
                onToggleEditMode={handleToggleEditMode}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900 min-h-0">
                {/* Left Navigation */}
                <div className={`${isCollapsed ? 'w-16' : 'w-80'} flex flex-col bg-white dark:bg-gray-800/50 transition-all duration-300 relative min-h-0`}>
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
                    <div className={`${isCollapsed ? 'hidden' : ''} flex-none`}>
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
                            steps={workflowSteps}
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
                                        {stepRequestsInput ? (
                                            <InputStepRunner
                                                isOpen={showInputModal}
                                                onClose={handleInputCancel}
                                                onInputSubmit={handleInputSubmit}
                                            />
                                        ) : (
                                            currentStep ? (
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
                                            )
                                        )}
                                    </div>

                                    {currentStep && (
                                        <WorkflowNavigation
                                            isEditMode={isEditMode}
                                            activeStep={activeStep}
                                            isInputRequired={stepRequestsInput}
                                            totalSteps={workflowSteps.length}
                                            step_type={currentStep?.step_type as WorkflowStepType || WorkflowStepType.ACTION}
                                            isLoading={isLoading || isExecuting}
                                            stepExecuted={stepExecuted}
                                            onBack={handleBack}
                                            onNext={handleNext}
                                            onExecute={handleExecute}
                                            onRestart={handleNewQuestion}
                                            onInputSubmit={handleInputSubmit}
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