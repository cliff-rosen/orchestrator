import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types
import { WorkflowStep, WorkflowStepType, RuntimeWorkflowStep } from '../types/workflows';
import { ResolvedParameters, ToolParameterName, ToolOutputName } from '../types/tools';

// Context
import { useWorkflows } from '../context/WorkflowContext';

// API
import { toolApi } from '../lib/api';

// Page components
import WorkflowConfig from './WorkflowConfig';
import MenuBar from './MenuBar';
import WorkflowStepsList from './WorkflowStepsList';
import StepDetail from './StepDetail';
import WorkflowNavigation from './WorkflowNavigation';

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
                        resolvedParameters[paramName as ToolParameterName] = variable?.value;
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
                        console.log(`Setting output ${outputName} to ${varName}:`, value);

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
        // setActiveStep(0);
        // return null;
    }


    ///////////////////////// Render /////////////////////////

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <MenuBar
                    isEditMode={isEditMode}
                    showConfig={showConfig}
                    onToggleConfig={() => setShowConfig(!showConfig)}
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
                showConfig={showConfig}
                onToggleConfig={() => setShowConfig(!showConfig)}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                <WorkflowStepsList
                    steps={allSteps}
                    activeStep={activeStep}
                    isEditMode={isEditMode}
                    showConfig={showConfig}
                    onStepClick={handleStepClick}
                    onAddStep={handleAddStep}
                />

                {/* Main Content */}
                <div className="container mx-auto px-4 py-6">
                    <div className="flex-1">
                        {showConfig ? (
                            <WorkflowConfig />
                        ) : (
                            <>
                                {/* Step Detail */}
                                <div className="mt-4">
                                    <StepDetail
                                        step={allSteps[activeStep]}
                                        isEditMode={isEditMode}
                                        onStepUpdate={handleStepUpdate}
                                        onStepDelete={handleStepDelete}
                                    />
                                </div>

                                <WorkflowNavigation
                                    isEditMode={isEditMode}
                                    activeStep={activeStep}
                                    totalSteps={allSteps.length}
                                    step_type={currentStep?.step_type as WorkflowStepType || WorkflowStepType.ACTION}
                                    isLoading={isLoading}
                                    stepExecuted={stepExecuted}
                                    onBack={handleBack}
                                    onNext={handleNext}
                                    onExecute={handleExecuteTool}
                                    onRestart={handleNewQuestion}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workflow; 