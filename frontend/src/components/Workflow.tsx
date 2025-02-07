import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types
import { WorkflowStep, WorkflowVariable, WorkflowStepType, RuntimeWorkflowStep } from '../types/workflows';
import { Tool } from '../types/tools';
import { ResolvedParameters, ToolParameterName, ToolOutputName } from '../types/tools';
import { StateManager } from '../hooks/schema/types';

// Context
import { useWorkflows } from '../context/WorkflowContext';
import { useStateManager } from '../hooks/schema/useStateManager';

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
        saveWorkflow,
        loadWorkflow,
        isLoading,
        error: contextError,
        activeStep,
        setActiveStep
    } = useWorkflows();

    // State
    const stateManager: StateManager = useStateManager();
    const [stepExecuted, setStepExecuted] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [tools, setTools] = useState<Tool[]>([]);

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

    // Fetch available tools
    useEffect(() => {
        const fetchTools = async () => {
            try {
                const availableTools = await toolApi.getAvailableTools();
                setTools(availableTools);
            } catch (err) {
                setError('Failed to load tools');
            }
        };

        fetchTools();
    }, []);

    // Reset stepExecuted when active step changes
    useEffect(() => {
        setStepExecuted(false);
    }, [activeStep]);

    //////////////////////// Handlers ////////////////////////

    const handleSave = async () => {
        try {
            await saveWorkflow();
            // After saving, if this was a new workflow, update the URL with the new ID
            if (workflowId === 'new' && workflow?.workflow_id) {
                navigate(`/workflow/${workflow.workflow_id}`, { replace: true });
            }
        } catch (err) {
            setError('Failed to save workflow');
        }
    };

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
                // Get resolved parameters from state manager
                const resolvedParameters: ResolvedParameters = {};
                if (currentStep.parameter_mappings) {
                    for (const [paramName, varName] of Object.entries(currentStep.parameter_mappings)) {
                        const value = stateManager.getValue(varName);
                        console.log(`Resolving parameter ${paramName} from ${varName}:`, value);
                        resolvedParameters[paramName as ToolParameterName] = value;
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
                // Get the correct tool ID
                const toolId = currentStep.tool.tool_id;
                // Execute the tool
                const outputs = await toolApi.executeTool(toolId, resolvedParameters);
                console.log('Tool execution outputs:', outputs);

                // Store outputs in state manager
                if (currentStep.output_mappings) {
                    // First ensure the output variables are registered in the schema manager
                    for (const [outputName, varName] of Object.entries(currentStep.output_mappings)) {
                        const outputParam = currentStep.tool.signature.outputs.find(
                            p => p.name === outputName
                        );
                        if (outputParam) {
                            console.log(`Registering output schema for ${varName}:`, outputParam);
                            // Register the output schema if not already registered
                            stateManager.setSchema(varName, {
                                name: varName,
                                type: outputParam.schema.type as any
                            }, 'output');
                        }
                    }

                    // Then set the values
                    for (const [outputName, varName] of Object.entries(currentStep.output_mappings)) {
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
        if (!workflow) return;

        // Update workflow state
        updateWorkflow({ inputs });

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
        if (!workflow) return;

        // Update workflow state
        updateWorkflow({ outputs });

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
                                        stateManager={stateManager}
                                        isEditMode={isEditMode}
                                        tools={tools}
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