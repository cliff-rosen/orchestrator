import React from 'react';
import { StateManager } from '../hooks/schema/types';
import { Tool } from '../types/tools';

interface OutputMapperProps {
    tool: Tool;
    output_mappings: Record<string, string>;
    stateManager: StateManager;
    onChange: (mappings: Record<string, string>) => void;
}

const OutputMapper: React.FC<OutputMapperProps> = ({
    tool,
    output_mappings,
    stateManager,
    onChange
}) => {
    const handleChange = (outputName: string, value: string) => {
        onChange({
            ...output_mappings,
            [outputName]: value
        });
    };


    return (
        <div className="space-y-4">
            {tool.signature.outputs.map((output) => (
                <div key={output.name} className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {output.name}
                        {output.description && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({output.description})
                            </span>
                        )}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            Type: {output.schema.type}
                        </span>
                    </label>
                    <select
                        value={output_mappings[output.name] || ''}
                        onChange={(e) => handleChange(output.name, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="" className="text-sm">Select a variable...</option>
                        {Object.entries(stateManager.schemas)
                            .filter(([_, schema]) => schema.schema.type === output.schema.type)
                            .map(([name, schema]) => (
                                <option key={name} value={name}
                                    className="text-sm text-gray-900 dark:text-gray-100">
                                    {name} ({schema.schema.type})
                                </option>
                            ))}
                    </select>
                </div>
            ))}
        </div>
    );
};

export default OutputMapper; 