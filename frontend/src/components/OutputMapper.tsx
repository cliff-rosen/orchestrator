import React from 'react';
import { Tool } from '../types/tools';
import { SchemaManager } from '../hooks/schema/types';

interface OutputMapperProps {
    tool: Tool;
    parameterMappings: Record<string, string>;
    stateManager: SchemaManager;
    onChange: (mappings: Record<string, string>) => void;
}

const OutputMapper: React.FC<OutputMapperProps> = ({
    tool,
    parameterMappings,
    stateManager,
    onChange
}) => {
    const handleChange = (outputName: string, value: string) => {
        onChange({
            ...parameterMappings,
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
                            Type: {output.type}
                        </span>
                    </label>
                    <select
                        value={parameterMappings[output.name] || ''}
                        onChange={(e) => handleChange(output.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">Select a variable...</option>
                        {Object.entries(stateManager.schemas)
                            .filter(([_, schema]) => schema.schema.type === output.type)
                            .map(([name, schema]) => (
                                <option key={name} value={name}
                                    className="text-gray-900 dark:text-gray-100">
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