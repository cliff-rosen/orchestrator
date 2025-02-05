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
    const [editingName, setEditingName] = React.useState(false);

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
                        {isEditMode && (
                            <>
                                {editingName ? (
                                    <input
                                        type="text"
                                        value={currentWorkflow.name}
                                        onChange={(e) => updateCurrentWorkflow({ name: e.target.value })}
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
                                            {currentWorkflow.name || 'Untitled Workflow'}
                                            {hasUnsavedChanges && ' *'}
                                        </span>
                                        <button
                                            onClick={() => setEditingName(true)}
                                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            title="Edit workflow name"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        {!isEditMode && (
                            <span className="text-gray-600 dark:text-gray-300">
                                {currentWorkflow.name || 'Untitled Workflow'}
                                {hasUnsavedChanges && ' *'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center">
                    {/* Configuration Mode Toggle */}
                    <div className="mr-6">
                        <button
                            onClick={onToggleConfig}
                            className={`group relative inline-flex h-9 w-[5.5rem] items-center rounded-lg transition-all
                                ${showConfig
                                    ? 'bg-blue-500 dark:bg-blue-500 shadow-sm'
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                                }`}
                            title="Configure workflow inputs and outputs"
                        >
                            {/* Toggle Circle */}
                            <span
                                className={`absolute flex h-7 w-7 items-center justify-center rounded-md 
                                    transition-all duration-200 ease-in-out
                                    ${showConfig
                                        ? 'left-[2.75rem] bg-white dark:bg-gray-900 shadow-sm'
                                        : 'left-0.5 bg-white dark:bg-gray-700'}`}
                            >
                                <svg
                                    className={`h-4 w-4 transition-all
                                        ${showConfig
                                            ? 'rotate-180 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-gray-400'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </span>

                            {/* Labels */}
                            <span className={`absolute font-medium transition-all duration-200
                                ${showConfig
                                    ? 'left-2 text-white dark:text-white'
                                    : 'left-9 text-gray-600 dark:text-gray-400'}`}>
                                I/O
                            </span>

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
                            className={`px-3 py-1.5 rounded-md text-xs font-medium ${!hasUnsavedChanges || isLoading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                                } transition-colors flex items-center space-x-1.5`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent dark:border-emerald-400 dark:border-t-transparent"></div>
                                    <span>Saving</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    <span>Save</span>
                                </>
                            )}
                        </button>

                        {/* Mode Toggle Button */}
                        <button
                            onClick={onToggleEditMode}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 
                                     hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 
                                     dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-1.5"
                        >
                            {isEditMode ? (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Run</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit</span>
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