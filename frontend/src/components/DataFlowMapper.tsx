import React, { useState } from 'react';
import { Tool } from '../types/tools';
import { WorkflowVariable } from '../types/workflows';
import { SchemaValue } from '../types/schema';

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
    const isCompatibleType = (paramSchema: SchemaValue, varSchema: SchemaValue): boolean => {
        // Special case: allow string array to string conversion
        if (paramSchema.type === 'string' && !paramSchema.array_type &&
            varSchema.type === 'string' && varSchema.array_type) {
            return true;
        }

        // Check if either is an array type
        if (paramSchema.array_type !== varSchema.array_type) {
            return false;
        }

        // Basic type must match exactly
        if (paramSchema.type !== varSchema.type) {
            return false;
        }

        // For objects, check field compatibility
        if (paramSchema.type === 'object' && paramSchema.fields && varSchema.fields) {
            // Check that all required fields in paramSchema exist in varSchema with compatible types
            return Object.entries(paramSchema.fields).every(([fieldName, fieldSchema]) => {
                const varFields = varSchema.fields || {};
                const varField = varFields[fieldName];
                return varField && isCompatibleType(fieldSchema, varField);
            });
        }

        // For primitive types and arrays of primitive types, exact match is sufficient
        return true;
    };

    // Get color for data type
    const getTypeColor = (type: string, isArray: boolean = false) => {
        if (isArray) {
            return 'text-orange-600 dark:text-orange-400';
        }
        switch (type) {
            case 'string': return 'text-blue-600 dark:text-blue-400';
            case 'number': return 'text-green-600 dark:text-green-400';
            case 'boolean': return 'text-purple-600 dark:text-purple-400';
            case 'array': return 'text-orange-600 dark:text-orange-400';
            case 'object': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    // Helper function to get display type
    const getDisplayType = (schema: SchemaValue): string => {
        if (schema.array_type) {
            return `${schema.type}[]`;
        }
        return schema.type;
    };

    const handleParameterMappingChange = (paramName: string, value: string) => {
        console.log('DataFlowMapper - Parameter mapping change:', { paramName, value });
        console.log('DataFlowMapper - Current mappings:', parameter_mappings);
        const newMappings = {
            ...parameter_mappings,
            [paramName]: value
        };
        console.log('DataFlowMapper - New mappings:', newMappings);
        onParameterMappingChange(newMappings);
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
                                key={input.variable_id}
                                className={`p-2 rounded-lg border ${hoveredConnection === input.schema.name
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(input.schema.name)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{input.schema.name}</span>
                                    <span className={`text-xs ${getTypeColor(input.schema.type, input.schema.array_type)}`}>
                                        {getDisplayType(input.schema)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {input.schema.description}
                                </p>
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
                                key={output.variable_id}
                                className={`p-2 rounded-lg border ${hoveredConnection === output.schema.name
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(output.schema.name)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{output.schema.name}</span>
                                    <span className={`text-xs ${getTypeColor(output.schema.type, output.schema.array_type)}`}>
                                        {getDisplayType(output.schema)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {output.schema.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tool Parameters */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Tool Inputs
                    </h4>
                    {tool.signature.parameters.map(param => (
                        <div
                            key={param.schema.name}
                            className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{param.schema.name}</span>
                                <span className={`text-xs ${getTypeColor(param.schema.type, param.schema.array_type)}`}>
                                    {getDisplayType(param.schema)}
                                </span>
                            </div>
                            {param.schema.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {param.schema.description}
                                </p>
                            )}
                            <select
                                value={parameter_mappings[param.schema.name] || ''}
                                onChange={(e) => handleParameterMappingChange(param.schema.name, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(parameter_mappings[param.schema.name])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Select source...</option>
                                {/* Input Variables */}
                                {inputs.length > 0 && (
                                    <optgroup label="Workflow Inputs" className="text-gray-900 dark:text-gray-100">
                                        {inputs
                                            .filter(input => isCompatibleType(param.schema, input.schema))
                                            .map(input => (
                                                <option key={input.schema.name} value={input.schema.name}
                                                    className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                                    {input.schema.name}
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
                                                <option key={output.schema.name} value={output.schema.name}
                                                    className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                                    {output.schema.name}
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
                            key={output.schema.name}
                            className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{output.schema.name}</span>
                                <span className={`text-xs ${getTypeColor(output.schema.type, output.schema.array_type)}`}>
                                    {getDisplayType(output.schema)}
                                </span>
                            </div>
                            {output.schema.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {output.schema.description}
                                </p>
                            )}
                            <select
                                value={output_mappings[output.schema.name] || ''}
                                onChange={(e) => onOutputMappingChange({
                                    ...output_mappings,
                                    [output.schema.name]: e.target.value
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(output_mappings[output.schema.name])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Map to workflow output...</option>
                                {outputs
                                    .filter(out => {
                                        // Check if both the tool output and workflow variable are arrays
                                        const bothArrays = output.schema.array_type === out.schema.array_type;
                                        // Check if their base types match
                                        const typesMatch = output.schema.type === out.schema.type;
                                        return bothArrays && typesMatch;
                                    })
                                    .map(out => (
                                        <option key={out.schema.name} value={out.schema.name}
                                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                            {out.schema.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Type Legend */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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