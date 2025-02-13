import React, { useState } from 'react';
import { Tool } from '../types/tools';
import { WorkflowVariable } from '../types/workflows';
import { SchemaValue, ArrayValue } from '../types/schema';

interface DataFlowMapperProps {
    tool: Tool;
    parameter_mappings: Record<string, string>;
    output_mappings: Record<string, string>;
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    onParameterMappingChange: (mappings: Record<string, string>) => void;
    onOutputMappingChange: (mappings: Record<string, string>) => void;
}

const DataFlowMapper: React.FC<DataFlowMapperProps> = ({
    tool,
    parameter_mappings,
    output_mappings,
    inputs,
    outputs,
    onParameterMappingChange,
    onOutputMappingChange
}) => {
    const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

    // Helper function to check if a variable is compatible with a parameter
    const isCompatibleType = (paramSchema: SchemaValue, varSchema: SchemaValue) => {
        if (paramSchema.type === 'string') {
            if (varSchema.type === 'string') return true;
            if (varSchema.type === 'file') return true;
            if (varSchema.type === 'array') {
                return (varSchema as ArrayValue).items.type === 'string';
            }
            return false;
        }
        return paramSchema.type === varSchema.type;
    };

    // Get color for data type
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'string': return 'text-blue-600 dark:text-blue-400';
            case 'number': return 'text-green-600 dark:text-green-400';
            case 'boolean': return 'text-purple-600 dark:text-purple-400';
            case 'array': return 'text-orange-600 dark:text-orange-400';
            case 'object': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="relative">
            {/* Visual Data Flow Diagram */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Input Sources */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Available Data Sources
                    </h4>

                    {/* Workflow Inputs */}
                    <div className="space-y-2">
                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Workflow Inputs
                        </h5>
                        {inputs.map(input => (
                            <div
                                key={input.name}
                                className={`p-2 rounded-lg border ${hoveredConnection === input.name
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(input.name)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{input.name}</span>
                                    <span className={`text-xs ${getTypeColor(input.schema.type)}`}>
                                        {input.schema.type}
                                    </span>
                                </div>
                                {input.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {input.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Previous Step Outputs */}
                    <div className="space-y-2">
                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Previous Step Outputs
                        </h5>
                        {outputs.map(output => (
                            <div
                                key={output.name}
                                className={`p-2 rounded-lg border ${hoveredConnection === output.name
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(output.name)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{output.name}</span>
                                    <span className={`text-xs ${getTypeColor(output.schema.type)}`}>
                                        {output.schema.type}
                                    </span>
                                </div>
                                {output.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {output.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tool Parameters */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Tool Parameters
                    </h4>
                    {tool.signature.parameters.map(param => (
                        <div
                            key={param.name}
                            className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{param.name}</span>
                                <span className={`text-xs ${getTypeColor(param.schema.type)}`}>
                                    {param.schema.type}
                                </span>
                            </div>
                            {param.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {param.description}
                                </p>
                            )}
                            <select
                                value={parameter_mappings[param.name] || ''}
                                onChange={(e) => onParameterMappingChange({
                                    ...parameter_mappings,
                                    [param.name]: e.target.value
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(parameter_mappings[param.name])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Select source...</option>
                                {/* Input Variables */}
                                {inputs.length > 0 && (
                                    <optgroup label="Workflow Inputs" className="text-gray-900 dark:text-gray-100">
                                        {inputs
                                            .filter(input => isCompatibleType(param.schema, input.schema))
                                            .map(input => (
                                                <option key={input.name} value={input.name}
                                                    className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                                    {input.name}
                                                </option>
                                            ))}
                                    </optgroup>
                                )}
                                {/* Output Variables */}
                                {outputs.length > 0 && (
                                    <optgroup label="Previous Outputs" className="text-gray-900 dark:text-gray-100">
                                        {outputs
                                            .filter(output => isCompatibleType(param.schema, output.schema))
                                            .map(output => (
                                                <option key={output.name} value={output.name}
                                                    className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                                    {output.name}
                                                </option>
                                            ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    ))}
                </div>

                {/* Tool Outputs */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Tool Outputs
                    </h4>
                    {tool.signature.outputs.map(output => (
                        <div
                            key={output.name}
                            className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{output.name}</span>
                                <span className={`text-xs ${getTypeColor(output.schema.type)}`}>
                                    {output.schema.type}
                                </span>
                            </div>
                            {output.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {output.description}
                                </p>
                            )}
                            <select
                                value={output_mappings[output.name] || ''}
                                onChange={(e) => onOutputMappingChange({
                                    ...output_mappings,
                                    [output.name]: e.target.value
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(output_mappings[output.name])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Map to workflow output...</option>
                                {outputs
                                    .filter(out => out.schema.type === output.schema.type)
                                    .map(out => (
                                        <option key={out.name} value={out.name}
                                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                            {out.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Type Legend */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Data Types
                </h5>
                <div className="flex flex-wrap gap-4">
                    {['string', 'number', 'boolean', 'array', 'object'].map(type => (
                        <div key={type} className="flex items-center gap-1">
                            <span className={`w-3 h-3 rounded-full ${getTypeColor(type)} bg-current`} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {type}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DataFlowMapper; 