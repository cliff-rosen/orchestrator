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
import MenuBar from '../components/MenuBar';
import WorkflowStepsList from '../components/WorkflowStepsList';
import StepDetail from '../components/StepDetail';
import WorkflowNavigation from '../components/WorkflowNavigation';

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
                console.log('useEffect loading workflow:', workflowId);
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
    };

    const handleStepUpdate = (step: WorkflowStep | RuntimeWorkflowStep) => {
        if (!workflow) return;

        // Ensure tool_id is set if tool exists
        const updatedStep = {
            ...step,
            tool_id: step.tool?.tool_id
        };

        updateWorkflow({
            steps: workflow.steps.map((s: WorkflowStep) => s.step_id === step.step_id ? updatedStep : s)
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
        try {
            setIsExecuting(true);
            const currentStep = allSteps[activeStep];
            console.log('Executing step:', currentStep);

            if (currentStep.tool?.tool_id) {
                // Get resolved parameters from workflow variables
                const resolvedParameters: ResolvedParameters = {};
                if (currentStep.parameter_mappings) {
                    for (const [paramName, varName] of Object.entries(currentStep.parameter_mappings)) {
                        // Find the variable in either inputs or outputs
                        const variable = workflow?.inputs?.find(v => v.name === varName) ||
                            workflow?.outputs?.find(v => v.name === varName);
                        console.log(`Resolving parameter ${paramName} from ${varName}:`, variable?.value);

                        // If the variable is a file type and the parameter expects a string,
                        // fetch the file content
                        if (variable?.schema.type === 'file') {
                            // For file variables, value should be { file_id: string, content?: string }
                            const fileValue = variable.value;
                            if (fileValue?.file_id) {
                                try {
                                    // If we don't have the content cached, fetch it
                                    if (!fileValue.content) {
                                        const fileContent = await fileApi.getFileContent(fileValue.file_id);
                                        // Cache the content in the variable's value
                                        variable.value = {
                                            ...fileValue,
                                            content: fileContent.content
                                        };
                                    }
                                    resolvedParameters[paramName as ToolParameterName] = variable.value.content;
                                } catch (err) {
                                    console.error('Error fetching file content:', err);
                                    throw new Error(`Failed to fetch content for file parameter ${paramName}`);
                                }
                            } else {
                                console.warn(`File variable ${varName} has no file_id`);
                                resolvedParameters[paramName as ToolParameterName] = '';
                            }
                        } else {
                            resolvedParameters[paramName as ToolParameterName] = variable?.value;
                        }
                    }
                }

                // Add templateId for LLM tools
                if (currentStep.tool.tool_type === 'llm') {
                    if (!currentStep.prompt_template) {
                        throw new Error('No prompt template selected for LLM tool');
                    }
                    resolvedParameters['templateId' as ToolParameterName] = currentStep.prompt_template;
                }

                console.log('Executing tool with parameters:', resolvedParameters);
                const toolId = currentStep.tool.tool_id;
                const outputs = await toolApi.executeTool(toolId, resolvedParameters);
                console.log('Tool execution outputs:', outputs);

                // Store outputs in workflow variables
                if (currentStep.output_mappings) {
                    const updatedOutputs = [...(workflow?.outputs || [])];

                    for (const [outputName, varName] of Object.entries(currentStep.output_mappings)) {
                        const value = outputs[outputName as ToolOutputName];
                        console.log(`Loading output ${outputName} into ${varName} with value`, value);

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
    const workflowSteps: RuntimeWorkflowStep[] = workflow.steps.map((step: WorkflowStep) => ({
        ...step,
        action: handleExecuteTool,
        actionButtonText: () => stepExecuted ? 'Next Step' : 'Execute Tool',
        isDisabled: () => step.step_type === WorkflowStepType.ACTION && stepExecuted,
    }));

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

    // Get current step
    const currentStep = allSteps[activeStep];
    if (!currentStep) {
        console.log('currentStep does not exist');
        // Reset to first step if current step doesn't exist
        setActiveStep(0);
        // Don't return null here, let the UI render
    }


    ///////////////////////// Render /////////////////////////

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <MenuBar
                    isEditMode={isEditMode}
                    onToggleEditMode={() => setIsEditMode(!isEditMode)}
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
            <MenuBar
                isEditMode={isEditMode}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                {/* Left Navigation */}
                <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                    {/* Config Section */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 
                                     hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                        >
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Workflow Configuration</span>
                            </div>
                            <svg
                                className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Show Steps List when not in config mode */}
                    {!showConfig && (
                        <WorkflowStepsList
                            steps={allSteps}
                            activeStep={activeStep}
                            isEditMode={isEditMode}
                            onStepClick={handleStepClick}
                            onAddStep={handleAddStep}
                            onReorder={handleStepReorder}
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