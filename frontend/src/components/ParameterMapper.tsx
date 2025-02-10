import React from 'react';
import { Tool } from '../types/tools';
import { WorkflowVariable } from '../types/workflows';
import { SchemaValue, ArrayValue } from '../types/schema';

interface ParameterMapperProps {
    tool: Tool;
    parameter_mappings: Record<string, string>;
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    onChange: (mappings: Record<string, string>) => void;
}

const ParameterMapper: React.FC<ParameterMapperProps> = ({
    tool,
    parameter_mappings,
    inputs,
    outputs,
    onChange
}) => {
    const handleChange = (paramName: string, value: string) => {
        onChange({
            ...parameter_mappings,
            [paramName]: value
        });
    };

    // Helper function to check if a variable is compatible with a parameter
    const isCompatibleType = (paramSchema: SchemaValue, varSchema: SchemaValue) => {
        console.log('Checking compatibility:', {
            paramSchema,
            varSchema,
            paramType: paramSchema.type,
            varType: varSchema.type
        });

        // For prompt templates, string parameters can accept string arrays
        if (paramSchema.type === 'string') {
            // Accept either string or array of strings
            if (varSchema.type === 'string') return true;
            if (varSchema.type === 'array') {
                return (varSchema as ArrayValue).items.type === 'string';
            }
            return false;
        }

        // For non-string types, types must match exactly
        return paramSchema.type === varSchema.type;
    };

    return (
        <div className="space-y-4">
            {tool.signature.parameters.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    No parameters available for this tool.
                </div>
            ) : (
                tool.signature.parameters.map(param => (
                    <div key={param.name} className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {param.name}
                            {param.description && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    ({param.description})
                                </span>
                            )}
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                Type: {param.schema.type === 'array' ? `${(param.schema as ArrayValue).items.type}[]` : param.schema.type}
                                {param.schema.is_array ? '[]' : ''}
                            </span>
                        </label>
                        <select
                            value={parameter_mappings[param.name] || ''}
                            onChange={(e) => handleChange(param.name, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="" className="text-sm">Select variable...</option>
                            {/* Input Variables */}
                            {inputs.length > 0 && (
                                <optgroup label="Workflow Inputs">
                                    {inputs
                                        .filter(input => isCompatibleType(param.schema, input.schema))
                                        .map(input => (
                                            <option key={input.name} value={input.name}
                                                className="text-sm text-gray-900 dark:text-gray-100">
                                                {input.name}
                                            </option>
                                        ))
                                    }
                                </optgroup>
                            )}
                            {/* Output Variables */}
                            {outputs.length > 0 && (
                                <optgroup label="Previous Outputs">
                                    {outputs
                                        .filter(output => isCompatibleType(param.schema, output.schema))
                                        .map(output => (
                                            <option key={output.name} value={output.name}
                                                className="text-sm text-gray-900 dark:text-gray-100">
                                                {output.name}
                                            </option>
                                        ))
                                    }
                                </optgroup>
                            )}
                        </select>
                    </div>
                ))
            )}
        </div>
    );
};

export default ParameterMapper; 