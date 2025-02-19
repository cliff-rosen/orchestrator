import React, { useState } from 'react';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { WorkflowVariable, WorkflowVariableName } from '../types/workflows';
import { Schema } from '../types/schema';

interface DataFlowMapperProps {
    tool: Tool;
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    output_mappings: Record<ToolOutputName, WorkflowVariableName>;
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    onParameterMappingChange: (mappings: Record<ToolParameterName, WorkflowVariableName>) => void;
    onOutputMappingChange: (mappings: Record<ToolOutputName, WorkflowVariableName>) => void;
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
    const isCompatibleType = (paramSchema: Schema, varSchema: Schema): boolean => {
        // Special case: allow string array to string conversion
        if (paramSchema.type === 'string' && !paramSchema.is_array &&
            varSchema.type === 'string' && varSchema.is_array) {
            return true;
        }

        // Check if either is an array type
        if (paramSchema.is_array !== varSchema.is_array) {
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
    const getDisplayType = (schema: Schema): string => {
        if (schema.is_array) {
            return `${schema.type}[]`;
        }
        return schema.type;
    };

    const handleParameterMappingChange = (paramName: string, value: string) => {
        console.log('DataFlowMapper - Parameter mapping change:', { paramName, value });
        console.log('DataFlowMapper - Current mappings:', parameter_mappings);
        const newMappings = {
            ...parameter_mappings,
            [paramName as ToolParameterName]: value as WorkflowVariableName
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
                                className={`p-2 rounded-lg border ${hoveredConnection === input.variable_id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(input.variable_id)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{input.name}</span>
                                    <span className={`text-xs ${getTypeColor(input.schema.type, input.schema.is_array)}`}>
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
                                className={`p-2 rounded-lg border ${hoveredConnection === output.variable_id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                onMouseEnter={() => setHoveredConnection(output.variable_id)}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{output.name}</span>
                                    <span className={`text-xs ${getTypeColor(output.schema.type, output.schema.is_array)}`}>
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
                            key={param.name}
                            className="relative p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{param.name}</span>
                                <span className={`text-xs ${getTypeColor(param.schema.type, param.schema.is_array)}`}>
                                    {getDisplayType(param.schema)}
                                </span>
                            </div>
                            {param.schema.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {param.schema.description}
                                </p>
                            )}
                            <select
                                value={parameter_mappings[param.name as ToolParameterName] || ''}
                                onChange={(e) => handleParameterMappingChange(param.name, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(parameter_mappings[param.name as ToolParameterName])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Select source...</option>
                                {/* Input Variables */}
                                {inputs.length > 0 && (
                                    <optgroup label="Workflow Inputs" className="text-gray-900 dark:text-gray-100">
                                        {inputs
                                            .filter(input => isCompatibleType(param.schema, input.schema))
                                            .map(input => (
                                                <option key={input.variable_id} value={input.name as string}
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
                                                <option key={output.variable_id} value={output.name as string}
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
                                <span className={`text-xs ${getTypeColor(output.schema.type, output.schema.is_array)}`}>
                                    {getDisplayType(output.schema)}
                                </span>
                            </div>
                            {output.schema.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {output.schema.description}
                                </p>
                            )}
                            <select
                                value={output_mappings[output.name as ToolOutputName] || ''}
                                onChange={(e) => onOutputMappingChange({
                                    ...output_mappings,
                                    [output.name as ToolOutputName]: e.target.value as WorkflowVariableName
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onMouseEnter={() => setHoveredConnection(output_mappings[output.name as ToolOutputName])}
                                onMouseLeave={() => setHoveredConnection(null)}
                            >
                                <option value="" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Map to workflow output...</option>
                                {outputs
                                    .filter(out => {
                                        // Check if both the tool output and workflow variable are arrays
                                        const bothArrays = output.schema.is_array === out.schema.is_array;
                                        // Check if their base types match
                                        const typesMatch = output.schema.type === out.schema.type;
                                        return bothArrays && typesMatch;
                                    })
                                    .map(out => (
                                        <option key={out.variable_id} value={out.name as string}
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