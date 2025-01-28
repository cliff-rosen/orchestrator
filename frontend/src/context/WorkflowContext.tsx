import React, { createContext, useContext, useState, useEffect } from 'react';
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

    const createWorkflow = () => {
        // Create a new workflow in memory only (not saved to backend)
        const newWorkflow: Workflow = {
            id: '', // Empty ID since it's not saved yet
            name: 'Untitled Workflow',
            description: 'A new custom workflow',
            status: WorkflowStatus.DRAFT,
            inputs: [],
            outputs: [],
            steps: [
                {
                    id: 'step-1',
                    label: 'Step 1',
                    description: 'Step 1 description',
                    stepType: WorkflowStepType.ACTION,
                }
            ]
        };

        setCurrentWorkflow(newWorkflow);
        setHasUnsavedChanges(true);
    };

    const updateCurrentWorkflow = (updates: Partial<Workflow>) => {
        if (!currentWorkflow) return;

        setCurrentWorkflow(prev => ({
            ...prev!,
            ...updates
        }));
        setHasUnsavedChanges(true);
    };

    const saveWorkflow = async () => {
        if (!currentWorkflow) return;

        try {
            setLoading(true);
            let savedWorkflow: Workflow;

            if (!currentWorkflow.id) {
                // This is a new workflow that hasn't been saved yet
                const { id, ...workflowWithoutId } = currentWorkflow;
                const response = await workflowApi.createWorkflow(workflowWithoutId);
                // Convert workflow_id to id for frontend
                savedWorkflow = {
                    ...response,
                    id: response.workflow_id
                };
            } else {
                // This is an existing workflow being updated
                const response = await workflowApi.updateWorkflow(currentWorkflow.id, currentWorkflow);
                // Convert workflow_id to id for frontend
                savedWorkflow = {
                    ...response,
                    id: response.workflow_id
                };
            }

            // Update workflows list
            setWorkflows(prevWorkflows => {
                const index = prevWorkflows.findIndex(w => w.id === currentWorkflow.id);
                if (index >= 0) {
                    // Replace existing workflow
                    return [
                        ...prevWorkflows.slice(0, index),
                        savedWorkflow,
                        ...prevWorkflows.slice(index + 1)
                    ];
                } else {
                    // Add new workflow
                    return [...prevWorkflows, savedWorkflow];
                }
            });

            // Update current workflow with saved version
            setCurrentWorkflow(savedWorkflow);
            setHasUnsavedChanges(false);
        } catch (err) {
            setError('Failed to save workflow');
            console.error('Error saving workflow:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

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