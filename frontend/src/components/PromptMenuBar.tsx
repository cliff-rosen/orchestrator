import React from 'react';

interface PromptMenuBarProps {
    name: string;
    isSaving: boolean;
    isTesting: boolean;
    hasUnsavedChanges: boolean;
    onSave: () => void;
    onTest: () => void;
    onBack: () => void;
}

const PromptMenuBar: React.FC<PromptMenuBarProps> = ({
    name,
    isSaving,
    isTesting,
    hasUnsavedChanges,
    onSave,
    onTest,
    onBack
}) => {
    return (
        <div className="bg-white dark:bg-gray-800/50 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left Section - Back Button and Title */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
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
                        <span className="text-gray-600 dark:text-gray-300">
                            {name || 'Untitled Template'}
                            {hasUnsavedChanges && ' *'}
                        </span>
                    </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center space-x-3">
                    {/* Test Button */}
                    <button
                        onClick={onTest}
                        disabled={isTesting}
                        className="px-3 py-1.5 text-sm font-medium rounded-md text-green-600 dark:text-green-400 
                                 border border-green-600 dark:border-green-400 
                                 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTesting ? 'Testing...' : 'Test Template'}
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={onSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md text-white 
                                 transition-colors ${hasUnsavedChanges
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptMenuBar; 