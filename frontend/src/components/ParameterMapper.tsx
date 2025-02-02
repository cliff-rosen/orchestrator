import React from 'react';
import { StateManager } from '../hooks/schema/types';
import { ToolParameter } from '../types/tools';
import { Tool } from '../types/tools';

interface ParameterMapperProps {
    tool: Tool;
    parameterMappings: Record<string, string>;
    stateManager: StateManager;
    onChange: (mappings: Record<string, string>) => void;
}

const ParameterMapper: React.FC<ParameterMapperProps> = ({
    tool,
    parameterMappings,
    stateManager,
    onChange
}) => {
    const handleChange = (paramName: string, value: string) => {
        onChange({
            ...parameterMappings,
            [paramName]: value
        });
    };

    return (
        <div className="space-y-4">
            {tool.signature.parameters.map(param => (
                <div key={param.name} className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {param.name}
                        {param.description && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({param.description})
                            </span>
                        )}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            Type: {param.schema.type}
                        </span>
                    </label>
                    <select
                        value={parameterMappings[param.name] || ''}
                        onChange={(e) => handleChange(param.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">Select variable...</option>
                        {Object.entries(stateManager.schemas)
                            .filter(([_, schema]) => schema.schema.type === param.schema.type)
                            .map(([varName]) => (
                                <option key={varName} value={varName}
                                    className="text-gray-900 dark:text-gray-100">
                                    {varName}
                                </option>
                            ))
                        }
                    </select>
                </div>
            ))}
        </div>
    );
};

export default ParameterMapper; 