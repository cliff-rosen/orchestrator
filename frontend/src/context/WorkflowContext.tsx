import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowStepType, WorkflowStatus } from '../types';
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

    // Persist workflow state in sessionStorage
    useEffect(() => {
        if (workflow) {
            sessionStorage.setItem('currentWorkflow', JSON.stringify(workflow));
            sessionStorage.setItem('hasUnsavedChanges', JSON.stringify(hasUnsavedChanges));
            sessionStorage.setItem('activeStep', JSON.stringify(activeStep));
        }
    }, [workflow, hasUnsavedChanges, activeStep]);

    // Restore workflow state from sessionStorage
    useEffect(() => {
        const savedWorkflow = sessionStorage.getItem('currentWorkflow');
        const savedHasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
        const savedActiveStep = sessionStorage.getItem('activeStep');

        if (savedWorkflow) {
            setWorkflow(JSON.parse(savedWorkflow));
        }
        if (savedHasUnsavedChanges) {
            setHasUnsavedChanges(JSON.parse(savedHasUnsavedChanges));
        }
        if (savedActiveStep) {
            setActiveStep(JSON.parse(savedActiveStep));
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
                step_id: `step-${crypto.randomUUID()}`,
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
        if (!workflow) return;

        const updatedWorkflow = {
            ...workflow,
            ...updates,
            inputs: updates.inputs?.map(input => ({
                ...input,
                variable_id: input.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })) || workflow.inputs,
            outputs: updates.outputs?.map(output => ({
                ...output,
                variable_id: output.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            })) || workflow.outputs
        };

        setWorkflow(updatedWorkflow);
        setHasUnsavedChanges(true);
    }, [workflow]);

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
        setActiveStep(0);
        setHasUnsavedChanges(false);
        // Clear persisted state
        sessionStorage.removeItem('currentWorkflow');
        sessionStorage.removeItem('hasUnsavedChanges');
        sessionStorage.removeItem('activeStep');
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