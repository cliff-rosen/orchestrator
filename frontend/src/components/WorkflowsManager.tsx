import React from 'react';
import { useNavigate } from 'react-router-dom';

interface WorkflowStep {
    label: string;
    description: string;
}

interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly steps: readonly WorkflowStep[];
}

interface WorkflowsManagerProps {
    workflows: readonly Workflow[];
}

const WorkflowsManager: React.FC<WorkflowsManagerProps> = ({ workflows }) => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Research Workflows</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workflows.map((workflow) => (
                    <div
                        key={workflow.id}
                        onClick={() => navigate(workflow.path)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer 
                     hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                    >
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                            {workflow.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            {workflow.description}
                        </p>
                        <div className="mt-4">
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors text-sm font-medium"
                            >
                                Start Workflow
                            </button>
                        </div>
                    </div>
                ))}

                {/* Create New Workflow Card */}
                <div
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-md p-6 cursor-pointer 
                   hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 
                   dark:border-gray-600 flex flex-col items-center justify-center"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 
                       flex items-center justify-center mb-3">
                        <svg
                            className="w-6 h-6 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">
                        Create New Workflow
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-center text-sm">
                        Start a new custom research workflow
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkflowsManager; 