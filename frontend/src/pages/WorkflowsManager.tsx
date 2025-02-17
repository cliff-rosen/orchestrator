import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../context/WorkflowContext';
import { workflowApi } from '../lib/api';
import AssetList from '../components/common/AssetList';

const WorkflowsManager: React.FC = () => {
    const navigate = useNavigate();
    const {
        workflows,
        workflow: currentWorkflow,
        isLoading,
        loadWorkflows,
        createWorkflow
    } = useWorkflows();

    useEffect(() => {
        if (currentWorkflow) {
            navigate(`/workflow/${currentWorkflow.workflow_id}`);
        }
    }, [currentWorkflow, navigate]);

    const handleCreateWorkflow = () => {
        createWorkflow();
        navigate('/workflow/new');
    };

    const handleDelete = async (workflowId: string) => {
        try {
            await workflowApi.deleteWorkflow(workflowId);
            loadWorkflows(); // Refresh the list after deletion
        } catch (error) {
            console.error('Error deleting workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const handleEdit = (workflowId: string) => {
        navigate(`/workflow/${workflowId}`);
    };

    if (currentWorkflow) {
        return null;
    }

    const assets = workflows?.map(workflow => ({
        id: workflow.workflow_id,
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || 'No description',
        metadata: [
            {
                label: 'steps',
                value: workflow.steps?.length || 0
            },
            {
                label: 'inputs',
                value: workflow.inputs?.length || 0
            },
            {
                label: 'outputs',
                value: workflow.outputs?.length || 0
            }
        ]
    })) || [];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workflows...</p>
                </div>
            </div>
        );
    }

    return (
        <AssetList
            title="Workflows"
            subtitle="Design and author sequences of steps to accomplish your goals"
            assets={assets}
            onCreateNew={handleCreateWorkflow}
            onEdit={handleEdit}
            onDelete={handleDelete}
            createButtonText="New Workflow"
            emptyStateMessage="Get started by creating a new workflow."
        />
    );
};

export default WorkflowsManager; 