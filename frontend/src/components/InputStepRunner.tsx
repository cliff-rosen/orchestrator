// Rename from InputStepContent.tsx
// This is for collecting input values in run mode 

import React, { useState, useEffect } from 'react';
import { SchemaManager } from '../hooks/schema/types';

interface InputStepRunnerProps {
    prompt: string;
    variableName: string;
    stateManager: SchemaManager;
    onSubmit: (value: string) => void;
}

const InputStepRunner: React.FC<InputStepRunnerProps> = ({
    prompt,
    variableName,
    stateManager,
    onSubmit,
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(inputValue);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">Input Required</h3>
                <p className="text-sm text-gray-500">{prompt}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Value for {variableName}
                    </label>
                    <input
                        type="text"
                        id="input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your response..."
                    />
                </div>

                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Submit
                </button>
            </form>
        </div>
    );
};

export default InputStepRunner; 