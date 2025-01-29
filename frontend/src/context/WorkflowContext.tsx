import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workflow, WorkflowStepType, WorkflowStatus } from '../types';
import { workflowApi } from '../lib/api';

interface WorkflowContextType {
    workflows: Workflow[];
    currentWorkflow: Workflow | null;
    hasUnsavedChanges: boolean;
    loading: boolean;
    error: string | null;
    createWorkflow: () => void;
    saveWorkflow: () => Promise<void>;
    setCurrentWorkflow: (workflow: Workflow | null) => void;
    updateCurrentWorkflow: (updates: Partial<Workflow>) => void;
    refreshWorkflows: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshWorkflows = async () => {
        try {
            setLoading(true);
            const fetchedWorkflows = await workflowApi.getWorkflows();
            setWorkflows(fetchedWorkflows);
        } catch (err) {
            setError('Failed to load workflows');
            console.error('Error loading workflows:', err);
        } finally {
            setLoading(false);
        }
    };

    const createWorkflow = useCallback(() => {
        const newWorkflow: Workflow = {
            workflow_id: 'new',
            name: 'Untitled Workflow',
            description: 'A new custom workflow',
            status: WorkflowStatus.DRAFT,
            inputs: [],
            outputs: [],
            steps: [{
                id: `step-1`,
                label: 'Step 1',
                description: 'Configure this step by selecting a tool and setting up its parameters',
                stepType: WorkflowStepType.ACTION
            }]
        };
        setCurrentWorkflow(newWorkflow);
        setHasUnsavedChanges(true);
    }, []);

    const saveWorkflow = useCallback(async () => {
        if (!currentWorkflow) return;

        try {
            let savedWorkflow: Workflow;
            if (currentWorkflow.workflow_id === 'new') {
                // Create new workflow
                const { workflow_id, ...workflowData } = currentWorkflow;
                savedWorkflow = await workflowApi.createWorkflow(workflowData);
                // Update workflows list with new workflow
                setWorkflows(prev => [...prev, savedWorkflow]);
            } else {
                // Update existing workflow
                savedWorkflow = await workflowApi.updateWorkflow(currentWorkflow.workflow_id, currentWorkflow);
                // Update workflows list with updated workflow
                setWorkflows(prev =>
                    prev.map(w => w.workflow_id === savedWorkflow.workflow_id ? savedWorkflow : w)
                );
            }
            // Update current workflow with saved version
            setCurrentWorkflow(savedWorkflow);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error saving workflow:', error);
            throw error;
        }
    }, [currentWorkflow]);

    const updateCurrentWorkflow = useCallback((updates: Partial<Workflow>) => {
        setCurrentWorkflow(prev => {
            if (!prev) return prev;
            return { ...prev, ...updates };
        });
        setHasUnsavedChanges(true);
    }, []);

    useEffect(() => {
        refreshWorkflows();
    }, []);

    const value = {
        workflows,
        currentWorkflow,
        hasUnsavedChanges,
        loading,
        error,
        createWorkflow,
        saveWorkflow,
        setCurrentWorkflow,
        updateCurrentWorkflow,
        refreshWorkflows,
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