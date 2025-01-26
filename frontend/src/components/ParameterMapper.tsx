import React from 'react';
import { Tool } from '../types/tools';
import { SchemaManager } from '../hooks/schema/types';

interface ParameterMapperProps {
    tool: Tool;
    parameterMappings: Record<string, string>;
    stateManager: SchemaManager;
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
                <div key={param.name} className="flex flex-col">
                    <label className="text-sm font-medium mb-1">{param.name}</label>
                    <select
                        value={parameterMappings[param.name] || ''}
                        onChange={(e) => handleChange(param.name, e.target.value)}
                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="">Select variable...</option>
                        {Object.entries(stateManager.schemas)
                            .filter(([_, schema]) => schema.type === param.type)
                            .map(([varName]) => (
                                <option key={varName} value={varName}>
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