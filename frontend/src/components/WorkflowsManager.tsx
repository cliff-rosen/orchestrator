import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow } from '../types';

interface WorkflowsManagerProps {
    workflows: readonly Workflow[];
    onCreateWorkflow: () => Promise<Workflow>;
}

const WorkflowsManager: React.FC<WorkflowsManagerProps> = ({ workflows, onCreateWorkflow }) => {
    const navigate = useNavigate();

    const handleCreateWorkflow = async () => {
        try {
            const workflow = await onCreateWorkflow();
            navigate(workflow.path);
        } catch (error) {
            console.error('Error creating workflow:', error);
        }
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                    <div
                        key={workflow.id}
                        onClick={() => navigate(workflow.path)}
                        className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6 
                                 border border-gray-200 dark:border-gray-700
                                 hover:border-blue-500 dark:hover:border-blue-400
                                 cursor-pointer transition-colors"
                    >
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                            {workflow.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {workflow.description}
                        </p>
                        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                            <span>{workflow.steps.length} steps</span>
                            <span>{workflow.inputs.length} inputs</span>
                            <span>{workflow.outputs.length} outputs</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowsManager; 