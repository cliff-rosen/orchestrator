import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../context/WorkflowContext';
import { workflowApi } from '../lib/api';

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

    const handleDelete = async (e: React.MouseEvent, workflowId: string) => {
        e.stopPropagation(); // Prevent navigation when clicking delete

        if (!confirm('Are you sure you want to delete this workflow?')) {
            return;
        }

        try {
            await workflowApi.deleteWorkflow(workflowId);
            loadWorkflows(); // Refresh the list after deletion
        } catch (error) {
            console.error('Error deleting workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const handleWorkflowClick = (workflowId: string) => {
        navigate(`/workflow/${workflowId}`);
    };

    if (currentWorkflow) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Research Workflows</h1>
                <button
                    onClick={handleCreateWorkflow}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>New Workflow</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workflows...</p>
                    </div>
                </div>
            ) : !workflows || workflows.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No workflows</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new workflow.</p>
                    <div className="mt-6">
                        <button
                            onClick={handleCreateWorkflow}
                            className="inline-flex items-center px-4 py-2 border border-transparent 
                                     shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 
                                     hover:bg-blue-700 focus:outline-none focus:ring-2 
                                     focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            New Workflow
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.workflow_id}
                            onClick={() => handleWorkflowClick(workflow.workflow_id)}
                            className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6 
                                     border border-gray-200 dark:border-gray-700
                                     hover:border-blue-500 dark:hover:border-blue-400
                                     cursor-pointer transition-colors relative group"
                        >
                            <button
                                onClick={(e) => handleDelete(e, workflow.workflow_id)}
                                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 
                                         opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete workflow"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <div
                                className="h-full"
                            >
                                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                                    {workflow.name || 'Untitled Workflow'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    {workflow.description || 'No description'}
                                </p>
                                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                    <span>{workflow.steps?.length || 0} steps</span>
                                    <span>{workflow.inputs?.length || 0} inputs</span>
                                    <span>{workflow.outputs?.length || 0} outputs</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkflowsManager; 