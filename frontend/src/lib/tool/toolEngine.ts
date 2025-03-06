import {
    Tool,
    ToolOutputs,
    ToolOutputName,
    ResolvedParameters
} from '../../types/tools';
import { SchemaValueType, SchemaObjectType } from '../../types/schema';
import { executeTool } from './toolRegistry';

export class ToolEngine {
    /**
     * Executes a tool with the given parameters
     */
    static async executeTool(
        tool: Tool,
        parameters: ResolvedParameters
    ): Promise<ToolOutputs> {
        try {
            // Execute the tool using the registry
            return await executeTool(tool.tool_id, parameters);
        } catch (error) {
            console.error(`Error executing tool ${tool.tool_id}:`, error);
            throw error;
        }
    }


    /**
     * Formats tool outputs according to the tool's signature
     */
    static formatToolOutputs(
        outputs: Record<string, any>,
        tool: Tool
    ): ToolOutputs {
        const formattedOutputs: Record<ToolOutputName, SchemaValueType> = {};

        // Map each output to its defined schema type
        tool.signature.outputs.forEach(output => {
            if (output.name in outputs) {
                formattedOutputs[output.name] = this.coerceToSchemaType(
                    outputs[output.name],
                    output.schema.type
                );
            }
        });

        return formattedOutputs;
    }

    /**
     * Coerces a value to the specified schema type
     */
    private static coerceToSchemaType(
        value: any,
        type: string
    ): SchemaValueType {
        switch (type) {
            case 'string':
                return String(value);
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'array':
                // Arrays are not directly part of SchemaValueType
                // We need to convert the array to a SchemaObjectType with indexed keys
                if (Array.isArray(value)) {
                    const result: Record<string, SchemaValueType> = {};
                    value.forEach((item, index) => {
                        result[index.toString()] = typeof item === 'object' && item !== null
                            ? item as SchemaValueType
                            : item as SchemaValueType;
                    });
                    return result;
                }
                // If not an array, wrap in an object with a single item
                return { '0': value } as SchemaObjectType;
            case 'object':
                return typeof value === 'object' && value !== null
                    ? value as SchemaObjectType
                    : { value } as SchemaObjectType;
            default:
                return String(value);
        }
    }
} 