import {
    Tool,
    ToolOutputs,
    ToolOutputName,
    ResolvedParameters
} from '../../types/tools';
import { SchemaValueType } from '../../types/schema';
import { getToolExecutor } from './toolRegistry';

export class ToolEngine {
    /**
     * Executes a tool with the given parameters
     */
    static async executeTool(
        tool: Tool,
        parameters: ResolvedParameters
    ): Promise<ToolOutputs> {
        // Get the executor from registry
        const executor = getToolExecutor(tool.tool_id);
        if (!executor) {
            throw new Error(`No executor found for tool: ${tool.tool_id}`);
        }

        // Execute the tool
        return await executor(tool.tool_id, parameters);
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
                return Array.isArray(value) ? value : [value];
            case 'object':
                return typeof value === 'object' ? value : { value };
            default:
                return value;
        }
    }
} 