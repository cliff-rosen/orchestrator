import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowStepType, WorkflowStatus, WorkflowStepId } from '../types';
import { workflowApi } from '../lib/api';

interface WorkflowContextType {
    // Public State
    workflows: Workflow[]
    workflow: Workflow | null
    hasUnsavedChanges: boolean
    isLoading: boolean
    error: string | null
    activeStep: number
    setActiveStep: (step: number) => void

    // User Operations
    loadWorkflows(): Promise<void>
    createWorkflow(): void
    loadWorkflow(id: string): Promise<void>
    updateWorkflow(updates: Partial<Workflow>): void
    saveWorkflow(): Promise<void>
    exitWorkflow(): void
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
            inputs: [],
            outputs: [],
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
            const fetchedWorkflow = await workflowApi.getWorkflow(id);

            // Only update state if the ID still matches (prevent race conditions)
            if (id === fetchedWorkflow.workflow_id) {
                setWorkflow(fetchedWorkflow);
                setOriginalWorkflow(fetchedWorkflow); // Store the original state
                setHasUnsavedChanges(false);
                // Don't reset active step here to preserve navigation state
            }
        } catch (err) {
            setError('Failed to load workflow');
            console.error('Error loading workflow:', err);
        } finally {
            setIsLoading(false);
        }
    }, [createWorkflow, isLoading, workflow?.workflow_id]);

    const updateWorkflow = useCallback((updates: Partial<Workflow>) => {
        console.log('updateWorkflow called with updates:', updates);
        if (!workflow) return;

        // First, create the base updated workflow
        const baseWorkflow = {
            ...workflow,
            ...updates,
        };

        // Then, handle inputs and outputs separately to ensure we don't lose data
        const updatedWorkflow = {
            ...baseWorkflow,
            inputs: updates.inputs ? updates.inputs.map(input => ({
                ...input,
                variable_id: input.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })) : baseWorkflow.inputs || [],
            outputs: updates.outputs ? updates.outputs.map(output => ({
                ...output,
                variable_id: output.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })) : baseWorkflow.outputs || []
        };

        console.log('Setting workflow to:', updatedWorkflow);
        setWorkflow(updatedWorkflow);

        // Compare with original workflow to determine if there are unsaved changes
        if (originalWorkflow) {
            const hasChanges = JSON.stringify(updatedWorkflow) !== JSON.stringify(originalWorkflow);
            console.log('Setting hasUnsavedChanges to:', hasChanges);
            setHasUnsavedChanges(hasChanges);
        } else {
            setHasUnsavedChanges(true);
        }
    }, [workflow, originalWorkflow]);

    const saveWorkflow = useCallback(async () => {
        if (!workflow) return;

        try {
            setIsLoading(true);
            setError(null);
            let savedWorkflow: Workflow;

            if (workflow.workflow_id === 'new') {
                const { workflow_id, ...workflowData } = workflow;
                savedWorkflow = await workflowApi.createWorkflow(workflowData);
                setWorkflows(prev => [...prev, savedWorkflow]);
            } else {
                savedWorkflow = await workflowApi.updateWorkflow(workflow.workflow_id, workflow);
                setWorkflows(prev =>
                    prev.map(w => w.workflow_id === savedWorkflow.workflow_id ? savedWorkflow : w)
                );
            }
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

        // User Operations
        createWorkflow,
        loadWorkflow,
        loadWorkflows,
        updateWorkflow,
        saveWorkflow,
        exitWorkflow
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