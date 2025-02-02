import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow } from '../types/workflows';

interface MenuBarProps {
    currentWorkflow: Workflow;
    isEditMode: boolean;
    showConfig: boolean;
    hasUnsavedChanges: boolean;
    isLoading: boolean;
    onSave: () => Promise<void>;
    onToggleConfig: () => void;
    onToggleEditMode: () => void;
    updateCurrentWorkflow: (updates: Partial<Workflow>) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({
    currentWorkflow,
    isEditMode,
    showConfig,
    hasUnsavedChanges,
    isLoading,
    onSave,
    onToggleConfig,
    onToggleEditMode,
    updateCurrentWorkflow
}) => {
    const navigate = useNavigate();

    const handleBackNavigation = async () => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm('You have unsaved changes. Do you want to save before leaving?');
            if (shouldSave) {
                try {
                    await onSave();
                    navigate('/');
                } catch (err) {
                    console.error('Error saving workflow:', err);
                    // If save fails, ask if they want to leave anyway
                    if (window.confirm('Failed to save changes. Leave anyway?')) {
                        navigate('/');
                    }
                }
            } else {
                // User chose not to save, just exit
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left Section - Back Button and Title */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleBackNavigation}
                        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Workflows
                    </button>
                    {isEditMode ? (
                        <input
                            type="text"
                            value={currentWorkflow.name}
                            onChange={(e) => updateCurrentWorkflow({ name: e.target.value })}
                            placeholder="Enter workflow name"
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 
                                     rounded-md bg-white dark:bg-gray-700 
                                     text-gray-900 dark:text-gray-100
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                     min-w-[200px]"
                        />
                    ) : (
                        <span className="text-gray-600 dark:text-gray-300">
                            {currentWorkflow.name || 'Untitled Workflow'}
                            {hasUnsavedChanges && ' *'}
                        </span>
                    )}
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center">
                    {/* Configuration Mode Toggle */}
                    <div className="mr-6">
                        <button
                            onClick={onToggleConfig}
                            className={`group relative px-3 py-2 rounded-lg flex items-center space-x-2 border-2 transition-all
                                ${showConfig
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500'
                                }`}
                            title="Configure workflow inputs and outputs"
                        >
                            <svg className={`w-5 h-5 transition-transform ${showConfig ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                            <span className="font-medium">Configure I/O</span>

                            {/* Tooltip */}
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs
                                           bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 
                                           transition-opacity whitespace-nowrap pointer-events-none">
                                Configure workflow inputs and outputs
                            </span>
                        </button>
                    </div>

                    {/* Primary Actions */}
                    <div className="flex items-center space-x-3">
                        {/* Save Button */}
                        <button
                            onClick={onSave}
                            disabled={!hasUnsavedChanges || isLoading}
                            className={`px-4 py-2 rounded-lg ${!hasUnsavedChanges || isLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                                } transition-colors flex items-center space-x-2`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            <span>{isLoading ? 'Saving...' : 'Save'}</span>
                        </button>

                        {/* Mode Toggle Button */}
                        <button
                            onClick={onToggleEditMode}
                            className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 
                                     dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50
                                     transition-colors flex items-center space-x-2"
                        >
                            {isEditMode ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Run Workflow</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit Workflow</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenuBar; 