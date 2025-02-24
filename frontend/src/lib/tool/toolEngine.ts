import {
    Tool,
    ToolOutputs,
    ToolParameterName,
    ToolOutputName,
    ResolvedParameters,
    LLMParameters
} from '../../types/tools';
import { SchemaValueType } from '../../types/schema';


export class ToolEngine {
    /**
     * Executes a tool with the given parameters
     */
    static async executeTool(
        tool: Tool,
        parameters: ResolvedParameters,
        executor: (toolId: string, params: ResolvedParameters) => Promise<ToolOutputs>
    ): Promise<ToolOutputs> {
        // Transform parameters based on tool type
        const resolvedParams = await this.resolveParameters(tool, parameters);

        // Execute the tool
        return await executor(tool.tool_id, resolvedParams);
    }

    /**
     * Resolves parameters based on tool type and requirements
     */
    private static async resolveParameters(
        tool: Tool,
        parameters: ResolvedParameters
    ): Promise<ResolvedParameters> {
        // Handle LLM tools specially
        if (tool.tool_type === 'llm') {
            return this.resolveLLMParameters(parameters);
        }

        // For other tools, just validate and pass through
        return parameters;
    }

    /**
     * Resolves parameters specifically for LLM tools
     */
    private static async resolveLLMParameters(
        parameters: ResolvedParameters
    ): Promise<LLMParameters> {
        const regular_variables: Record<string, SchemaValueType> = {};
        const file_variables: Record<string, string> = {};

        // Get the prompt template ID from parameters
        const promptTemplateId = (parameters as { prompt_template_id?: string }).prompt_template_id;
        if (!promptTemplateId) {
            throw new Error('No prompt template ID provided for LLM tool');
        }

        // Transform parameters based on schema
        Object.entries(parameters).forEach(([key, value]) => {
            // Skip prompt template ID as it's handled separately
            if (key === 'prompt_template_id') return;

            if (typeof value === 'object' && value !== null && 'file_id' in value) {
                file_variables[key] = value.file_id as string;
            } else {
                regular_variables[key] = value as SchemaValueType;
            }
        });

        // Return transformed LLM parameters
        return {
            prompt_template_id: promptTemplateId,
            regular_variables,
            file_variables
        };
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