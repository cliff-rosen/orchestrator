import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../context/WorkflowContext';

interface WorkflowMenuBarProps {
    isEditMode: boolean;
    onToggleEditMode: () => void;
}

const WorkflowMenuBar: React.FC<WorkflowMenuBarProps> = ({
    isEditMode,
    onToggleEditMode,
}) => {
    const navigate = useNavigate();
    const { workflow, hasUnsavedChanges, saveWorkflow, exitWorkflow } = useWorkflows();
    const [editingName, setEditingName] = useState(false);

    if (!workflow) return null;

    const handleBack = async () => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm('You have unsaved changes. Do you want to save before leaving?');
            if (shouldSave) {
                try {
                    await saveWorkflow();
                    exitWorkflow();
                    navigate('/');
                } catch (err) {
                    console.error('Error saving workflow:', err);
                    if (window.confirm('Failed to save changes. Leave anyway?')) {
                        exitWorkflow();
                        navigate('/');
                    }
                }
            } else {
                exitWorkflow();
                navigate('/');
            }
        } else {
            exitWorkflow();
            navigate('/');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left Section - Back Button and Title */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 
                                 text-sm font-medium transition-colors duration-150 rounded-md px-2 py-1
                                 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex items-center space-x-2">
                        {isEditMode && editingName ? (
                            <input
                                type="text"
                                value={workflow.name}
                                onChange={(e) => workflow.name = e.target.value}
                                onBlur={() => setEditingName(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setEditingName(false);
                                    }
                                }}
                                autoFocus
                                placeholder="Enter workflow name"
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-700 
                                         text-gray-900 dark:text-gray-100
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                         min-w-[200px]"
                            />
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span className="text-gray-600 dark:text-gray-300">
                                    {workflow.name || 'Untitled Workflow'}
                                    {hasUnsavedChanges && ' *'}
                                </span>
                                {isEditMode && (
                                    <button
                                        onClick={() => setEditingName(true)}
                                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        title="Edit workflow name"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center space-x-3">
                    {/* Edit/Run Mode Toggle */}
                    <button
                        onClick={onToggleEditMode}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                            ${isEditMode
                                ? 'text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                : 'text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                    >
                        {isEditMode ? 'Switch to Run Mode' : 'Switch to Edit Mode'}
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={saveWorkflow}
                        disabled={!hasUnsavedChanges}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md text-white 
                                 transition-colors ${hasUnsavedChanges
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkflowMenuBar; 