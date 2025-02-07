import React from 'react';
import { Tool } from '../types/tools';
import { WorkflowVariable } from '../types/workflows';

interface OutputMapperProps {
    tool: Tool;
    output_mappings: Record<string, string>;
    outputs: WorkflowVariable[];
    onChange: (mappings: Record<string, string>) => void;
}

const OutputMapper: React.FC<OutputMapperProps> = ({
    tool,
    output_mappings,
    outputs,
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
                        {outputs
                            .filter(out => out.schema.type === output.schema.type)
                            .map(out => (
                                <option key={out.name} value={out.name}
                                    className="text-sm text-gray-900 dark:text-gray-100">
                                    {out.name}
                                </option>
                            ))}
                    </select>
                </div>
            ))}
        </div>
    );
};

export default OutputMapper; 