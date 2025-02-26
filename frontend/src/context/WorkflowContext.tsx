import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    Workflow,
    WorkflowStepType,
    WorkflowStatus,
    WorkflowStepId,
    WorkflowVariable,
    ToolParameterName,
    ToolOutputName,
    WorkflowVariableName,
    Tool,
    StepExecutionResult,
    WorkflowStep,
    RuntimeWorkflowStep
} from '../types';
import { workflowApi } from '../lib/api';
import { WorkflowEngine, StepReorderPayload } from '../lib/workflow/workflowEngine';


interface WorkflowContextType {
    // Public State
    workflows: Workflow[]
    workflow: Workflow | null
    hasUnsavedChanges: boolean
    isLoading: boolean
    error: string | null
    activeStep: number
    setActiveStep: (step: number) => void
    isExecuting: boolean
    stepExecuted: boolean

    // User Operations
    loadWorkflows(): Promise<void>
    loadWorkflow(id: string): Promise<void>
    createWorkflow(): void
    saveWorkflow(): Promise<void>
    exitWorkflow(): void
    // New granular update method
    updateWorkflowByAction(action: {
        type: 'UPDATE_PARAMETER_MAPPINGS' | 'UPDATE_OUTPUT_MAPPINGS' | 'UPDATE_STEP_TOOL' | 'UPDATE_STEP_TYPE' | 'ADD_STEP' | 'REORDER_STEPS' | 'DELETE_STEP' | 'UPDATE_STATE',
        payload: {
            stepId?: string,
            mappings?: Record<ToolParameterName, WorkflowVariableName> | Record<ToolOutputName, WorkflowVariableName>,
            tool?: Tool,
            newStep?: WorkflowStep,
            reorder?: StepReorderPayload,
            state?: WorkflowVariable[]
        }
    }): void

    // legacy update methods
    updateWorkflow(updates: Partial<Workflow>): void
    updateWorkflowStep(step: WorkflowStep | RuntimeWorkflowStep): void

    // Workflow Execution
    executeCurrentStep(): Promise<StepExecutionResult>
    moveToNextStep(): void
    moveToPreviousStep(): void
    resetWorkflow(): void

}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Public State
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isExecuting, setIsExecuting] = useState(false);
    const [stepExecuted, setStepExecuted] = useState(false);
    // Add state to track original workflow
    const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null);

    // Persist workflow state in sessionStorage
    useEffect(() => {
        if (workflow) {
            sessionStorage.setItem('currentWorkflow', JSON.stringify(workflow));
            sessionStorage.setItem('hasUnsavedChanges', JSON.stringify(hasUnsavedChanges));
            sessionStorage.setItem('activeStep', JSON.stringify(activeStep));
            sessionStorage.setItem('originalWorkflow', JSON.stringify(originalWorkflow));
        }
    }, [workflow, hasUnsavedChanges, activeStep, originalWorkflow]);

    // Restore workflow state from sessionStorage
    useEffect(() => {
        const savedWorkflow = sessionStorage.getItem('currentWorkflow');
        const savedHasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
        const savedActiveStep = sessionStorage.getItem('activeStep');
        const savedOriginalWorkflow = sessionStorage.getItem('originalWorkflow');

        if (savedWorkflow) {
            setWorkflow(JSON.parse(savedWorkflow));
        }
        if (savedHasUnsavedChanges) {
            setHasUnsavedChanges(JSON.parse(savedHasUnsavedChanges));
        }
        if (savedActiveStep) {
            setActiveStep(JSON.parse(savedActiveStep));
        }
        if (savedOriginalWorkflow) {
            setOriginalWorkflow(JSON.parse(savedOriginalWorkflow));
        }
    }, []);

    // User Operations
    const createWorkflow = useCallback(() => {
        const newWorkflow: Workflow = {
            workflow_id: 'new',
            name: 'Untitled Workflow',
            description: 'A new custom workflow',
            status: WorkflowStatus.DRAFT,
            state: [],
            steps: [{
                step_id: `step-${crypto.randomUUID()}` as WorkflowStepId,
                label: 'Step 1',
                description: 'First step',
                step_type: WorkflowStepType.ACTION,
                parameter_mappings: {},
                output_mappings: {},
                workflow_id: 'new',
                sequence_number: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]
        };
        setWorkflow(newWorkflow);
        setHasUnsavedChanges(true);
        setActiveStep(0);
    }, []);

    const loadWorkflows = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedWorkflows = await workflowApi.getWorkflows();
            setWorkflows(fetchedWorkflows);
        } catch (err) {
            setError('Failed to load workflows');
            console.error('Error loading workflows:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadWorkflow = useCallback(async (id: string) => {
        console.log('loadWorkflow', id);
        if (id === 'new') {
            createWorkflow();
            return;
        }

        // Skip if we're already loading
        if (isLoading) {
            console.log('Already loading');
            return;
        }

        // If we already have this workflow loaded and there are unsaved changes, don't reload
        if (workflow?.workflow_id === id) {
            console.log('Already loaded', workflow);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const baseWorkflow = await workflowApi.getWorkflow(id);

            // Convert to runtime workflow with state
            const runtimeWorkflow: Workflow = {
                ...baseWorkflow,
                state: baseWorkflow.state ?? []
            };

            setWorkflow(runtimeWorkflow);
            setOriginalWorkflow(runtimeWorkflow); // Store the original state
            setHasUnsavedChanges(false);
            setActiveStep(0);
        } catch (err) {
            setError('Failed to load workflow');
            console.error('Error loading workflow:', err);
        } finally {
            setIsLoading(false);
        }
    }, [createWorkflow, isLoading, workflow?.workflow_id]);

    const updateWorkflow = useCallback((updates: Partial<Workflow>) => {
        if (!workflow) return;

        // First, create the base updated workflow
        const baseWorkflow = {
            ...workflow,
            ...updates,
        };

        // Validate variable name uniqueness
        const validateVariableNames = (variables: WorkflowVariable[] | undefined): string | null => {
            if (!variables) return null;
            const names = new Set<string>();
            for (const variable of variables) {
                if (names.has(variable.name)) {
                    return `Duplicate variable name found: ${variable.name}`;
                }
                names.add(variable.name);
            }
            return null;
        };

        // Check for duplicate names in state variables
        const stateError = validateVariableNames(updates.state);
        if (stateError) {
            console.error('Variable name validation failed:', stateError);
            setError(stateError);
            return;
        }

        // Then, handle state updates to ensure we don't lose data
        const updatedWorkflow = {
            ...baseWorkflow,
            state: updates.state ? updates.state.map(variable => ({
                ...variable,
                variable_id: variable.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })) : baseWorkflow.state || []
        };

        console.log('Setting workflow to:', updatedWorkflow);
        setWorkflow(updatedWorkflow);

        // Compare with original workflow to determine if there are unsaved changes
        if (originalWorkflow) {
            const hasChanges = JSON.stringify(updatedWorkflow) !== JSON.stringify(originalWorkflow);
            setHasUnsavedChanges(hasChanges);
        } else {
            setHasUnsavedChanges(true);
        }
    }, [workflow, originalWorkflow]);

    const updateWorkflowStep = useCallback((step: WorkflowStep | RuntimeWorkflowStep) => {
        console.log('updateWorkflowStep called with step:', step);
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
    }, [workflow, updateWorkflow]);

    const saveWorkflow = useCallback(async () => {
        if (!workflow) return;

        try {
            setIsLoading(true);
            setError(null);

            const workflowData = {
                ...workflow,
                state: workflow.state ?? []
            };

            const savedWorkflow = workflow.workflow_id === 'new'
                ? await workflowApi.createWorkflow(workflowData)
                : await workflowApi.updateWorkflow(workflow.workflow_id, workflowData);

            setWorkflow(savedWorkflow);
            setOriginalWorkflow(savedWorkflow); // Update the original state after saving
            setHasUnsavedChanges(false);
        } catch (error) {
            setError('Failed to save workflow');
            console.error('Error saving workflow:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [workflow]);

    const exitWorkflow = useCallback(() => {
        setWorkflow(null);
        setOriginalWorkflow(null); // Clear original workflow state
        setActiveStep(0);
        setHasUnsavedChanges(false);
        // Clear persisted state
        sessionStorage.removeItem('currentWorkflow');
        sessionStorage.removeItem('hasUnsavedChanges');
        sessionStorage.removeItem('activeStep');
        sessionStorage.removeItem('originalWorkflow');
    }, []);

    const updateWorkflowByAction = useCallback((action: {
        type: 'UPDATE_PARAMETER_MAPPINGS' | 'UPDATE_OUTPUT_MAPPINGS' | 'UPDATE_STEP_TOOL' | 'UPDATE_STEP_TYPE' | 'ADD_STEP' | 'REORDER_STEPS' | 'DELETE_STEP' | 'UPDATE_STATE',
        payload: {
            stepId?: string,
            mappings?: Record<ToolParameterName, WorkflowVariableName> | Record<ToolOutputName, WorkflowVariableName>,
            tool?: Tool,
            newStep?: WorkflowStep,
            reorder?: StepReorderPayload,
            state?: WorkflowVariable[]
        }
    }) => {
        setWorkflow(currentWorkflow => {
            if (!currentWorkflow) return null;

            const newWorkflow = WorkflowEngine.updateWorkflowByAction(currentWorkflow, action);

            // Set active step to the new step when adding a step
            if (action.type === 'ADD_STEP') {
                setActiveStep(newWorkflow.steps.length - 1);
            }
            // Adjust active step when deleting a step
            else if (action.type === 'DELETE_STEP' && action.payload.stepId) {
                const deletedStepIndex = currentWorkflow.steps.findIndex(s => s.step_id === action.payload.stepId);
                if (deletedStepIndex !== -1 && deletedStepIndex <= activeStep) {
                    setActiveStep(Math.max(0, activeStep - 1));
                }
            }

            // Compare with original workflow to determine if there are unsaved changes
            if (originalWorkflow) {
                const hasChanges = JSON.stringify(newWorkflow) !== JSON.stringify(originalWorkflow);
                setHasUnsavedChanges(hasChanges);
            } else {
                setHasUnsavedChanges(true);
            }

            return newWorkflow;
        });
    }, [originalWorkflow, activeStep]);

    // Workflow Execution Methods
    const executeCurrentStep = useCallback(async (): Promise<StepExecutionResult> => {
        if (!workflow) {
            return {
                success: false,
                error: 'No workflow loaded'
            };
        }

        try {
            setIsExecuting(true);
            setError(null);

            // Execute step using WorkflowEngine - all state management handled internally
            const result = await WorkflowEngine.executeStep(workflow, activeStep - 1, updateWorkflow);

            // Track UI execution state
            setStepExecuted(true);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsExecuting(false);
        }
    }, [workflow, activeStep, updateWorkflow]);

    const moveToNextStep = useCallback(() => {
        if (!workflow) return;
        const nextStep = WorkflowEngine.getNextStepIndex(workflow, activeStep);
        setActiveStep(nextStep);
        setStepExecuted(false);
    }, [workflow, activeStep]);

    const moveToPreviousStep = useCallback(() => {
        setActiveStep(Math.max(0, activeStep - 1));
        setStepExecuted(false);
    }, [activeStep]);

    const resetWorkflow = useCallback(() => {
        if (!workflow?.state) return;

        // Clear all output values
        const clearedState = workflow.state.map(variable =>
            variable.io_type === 'output' ? { ...variable, value: undefined } : variable
        );
        updateWorkflow({ state: clearedState });
        setActiveStep(0);
        setStepExecuted(false);
    }, [workflow, updateWorkflow]);

    // Initial load
    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    const value: WorkflowContextType = {
        // Public State
        workflows,
        workflow,
        hasUnsavedChanges,
        isLoading,
        error,
        activeStep,
        setActiveStep,
        isExecuting,
        stepExecuted,

        // User Operations
        createWorkflow,
        loadWorkflow,
        loadWorkflows,
        updateWorkflow,
        updateWorkflowStep,
        saveWorkflow,
        exitWorkflow,
        updateWorkflowByAction,

        // Workflow Execution
        executeCurrentStep,
        moveToNextStep,
        moveToPreviousStep,
        resetWorkflow
    };

    return (
        <WorkflowContext.Provider value={value}>
            {children}
        </WorkflowContext.Provider>
    );
};

export const useWorkflows = (): WorkflowContextType => {
    const context = useContext(WorkflowContext);
    if (context === undefined) {
        throw new Error('useWorkflows must be used within a WorkflowProvider');
    }
    return context;
}; 