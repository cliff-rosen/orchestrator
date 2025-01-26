import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workflow, WorkflowStepType } from '../types';
import { workflowApi } from '../lib/api';

interface WorkflowContextType {
    workflows: Workflow[];
    loading: boolean;
    error: string | null;
    createWorkflow: () => Promise<Workflow>;
    refreshWorkflows: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
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

    const createWorkflow = async (): Promise<Workflow> => {
        const newId = `workflow-${workflows.length + 1}`;
        const newWorkflow: Workflow = {
            id: newId,
            name: 'Untitled Workflow',
            description: 'A new custom workflow',
            path: `/workflow/${newId}`,
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

        try {
            // In a real app, this would be an API call
            // const createdWorkflow = await workflowApi.createWorkflow(newWorkflow);
            setWorkflows([...workflows, newWorkflow]);
            return newWorkflow;
        } catch (err) {
            console.error('Error creating workflow:', err);
            throw err;
        }
    };

    useEffect(() => {
        refreshWorkflows();
    }, []);

    const value = {
        workflows,
        loading,
        error,
        createWorkflow,
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