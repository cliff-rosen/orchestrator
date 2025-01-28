import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../context/WorkflowContext';

const WorkflowsManager: React.FC = () => {
    const navigate = useNavigate();
    const { workflows, loading } = useWorkflows();

    const handleCreateWorkflow = () => {
        navigate('/workflow/new');
    };

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

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
                            key={workflow.id}
                            onClick={() => navigate(`/workflow/${workflow.id}`)}
                            className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6 
                                     border border-gray-200 dark:border-gray-700
                                     hover:border-blue-500 dark:hover:border-blue-400
                                     cursor-pointer transition-colors"
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
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkflowsManager; 