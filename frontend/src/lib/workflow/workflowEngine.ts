import {
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    EvaluationOperator,
    StepExecutionResult,
    WorkflowStepType,
    Workflow,
    WorkflowStepId,
    EvaluationResult
} from '../../types/workflows';
import { ToolParameterName, ToolOutputName, Tool } from '../../types/tools';
import { SchemaValueType, Schema } from '../../types/schema';
import { ToolEngine } from '../tool/toolEngine';
import { resolveVariablePath, parseVariablePath, setValueAtPath, resolvePropertyPath, findVariableByRootName } from '../utils/variablePathUtils';

export type StepReorderPayload = {
    reorderedSteps: WorkflowStep[];
};

/**
 * Represents an action that can be performed on the workflow state.
 * This is used to standardize all workflow state updates and ensure consistency.
 * 
 * Action types:
 * - UPDATE_PARAMETER_MAPPINGS: Updates the parameter mappings for a step
 * - UPDATE_OUTPUT_MAPPINGS: Updates the output mappings for a step
 * - UPDATE_STEP_TOOL: Updates the tool for a step
 * - UPDATE_STEP_TYPE: Updates the type of a step
 * - ADD_STEP: Adds a new step to the workflow
 * - REORDER_STEPS: Reorders the steps in the workflow
 * - DELETE_STEP: Deletes a step from the workflow
 * - UPDATE_STATE: Updates the workflow state variables
 * - RESET_EXECUTION: Resets the execution state of the workflow
 * - UPDATE_WORKFLOW: Updates the workflow properties
 * - UPDATE_STEP: Updates a step in the workflow
 * - RESET_WORKFLOW_STATE: Resets the workflow state, optionally keeping jump counters
 */
export type WorkflowStateAction = {
    type: 'UPDATE_PARAMETER_MAPPINGS' | 'UPDATE_OUTPUT_MAPPINGS' | 'UPDATE_STEP_TOOL' | 'UPDATE_STEP_TYPE' | 'ADD_STEP' | 'REORDER_STEPS' | 'DELETE_STEP' | 'UPDATE_STATE' | 'RESET_EXECUTION' | 'UPDATE_WORKFLOW' | 'UPDATE_STEP' | 'RESET_WORKFLOW_STATE',
    payload: {
        stepId?: string,
        mappings?: Record<ToolParameterName, WorkflowVariableName> | Record<ToolOutputName, WorkflowVariableName>,
        tool?: Tool,
        newStep?: WorkflowStep,
        reorder?: StepReorderPayload,
        state?: WorkflowVariable[],
        workflowUpdates?: Partial<Workflow>,
        step?: WorkflowStep,
        keepJumpCounters?: boolean
    }
};

export class WorkflowEngine {
    /**
     * Creates a new workflow step with proper defaults and business logic
     */
    static createNewStep(workflow: Workflow): WorkflowStep {
        const stepId = `step-${crypto.randomUUID()}` as WorkflowStepId;
        return {
            step_id: stepId,
            label: `Step ${workflow.steps.length + 1}`,
            description: 'Configure this step by selecting a tool and setting up its parameters',
            step_type: WorkflowStepType.ACTION,
            workflow_id: workflow.workflow_id,
            sequence_number: workflow.steps.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parameter_mappings: {},
            output_mappings: {},
            tool: undefined,
            tool_id: undefined,
            prompt_template_id: undefined
        };
    }

    /**
     * Gets input values for a step formatted for UI display
     * This is a public wrapper around the private getResolvedParameters method
     * that formats the data for UI components
     */
    static getStepInputValuesForUI(
        step: WorkflowStep,
        workflow: Workflow | null
    ): Record<string, { value: any, schema: any }> {
        if (!step.parameter_mappings || !workflow?.state) return {};

        const result: Record<string, { value: any, schema: any }> = {};

        Object.entries(step.parameter_mappings).forEach(([paramName, varName]) => {
            const variable = workflow.state?.find(v => v.name === varName);

            if (!variable) {
                result[paramName] = {
                    value: null,
                    schema: null
                };
                return;
            }

            result[paramName] = {
                value: variable.value,
                schema: variable.schema
            };
        });

        return result;
    }

    /**
     * Gets the required input variable names for a workflow step
     * Used to determine which inputs need to be collected from the user
     * before executing a step
     */
    static getRequiredInputsForStep(
        step: WorkflowStep
    ): WorkflowVariableName[] {
        let requiredInputNames: WorkflowVariableName[] = [];

        // For action steps, get inputs from parameter mappings
        if (step.step_type === WorkflowStepType.ACTION && step.parameter_mappings) {
            requiredInputNames = Object.values(step.parameter_mappings)
                .filter(mapping => typeof mapping === 'string')
                .map(mapping => mapping as WorkflowVariableName);
        }
        // For evaluation steps, get inputs from evaluation conditions
        else if (step.step_type === WorkflowStepType.EVALUATION && step.evaluation_config) {
            // Extract variable names from all conditions
            requiredInputNames = step.evaluation_config.conditions
                .map(condition => condition.variable as WorkflowVariableName)
                .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
        }

        return requiredInputNames;
    }

    /**
     * Gets default value for a schema type
     * Used to initialize form values and create default variables
     */
    static getDefaultValueForSchema(schema: Schema): SchemaValueType {
        if (schema.type === 'string') return '';
        if (schema.type === 'number') return 0;
        if (schema.type === 'boolean') return false;
        if (schema.type === 'file') return {
            file_id: '',
            name: '',
            content: new Uint8Array(),
            mime_type: '',
            size: 0,
            created_at: '',
            updated_at: ''
        };
        if (schema.type === 'object') {
            const result: Record<string, SchemaValueType> = {};
            if (schema.fields) {
                for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                    result[key] = this.getDefaultValueForSchema(fieldSchema);
                }
            }
            return result;
        }
        return '';
    }

    /**
     * Formats a value for display in the UI
     * Handles truncation and special formatting for different types
     */
    static formatValueForDisplay(
        value: any,
        schema: Schema | undefined,
        options: {
            maxTextLength?: number,
            maxArrayLength?: number,
            maxArrayItemLength?: number
        } = {}
    ): string {
        // Default options
        const {
            maxTextLength = 200,
            maxArrayLength = 3,
            maxArrayItemLength = 100
        } = options;

        // Handle undefined/null
        if (value === undefined || value === null) {
            return 'No value';
        }

        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';

            const items = value.slice(0, maxArrayLength).map(item => {
                const itemStr = typeof item === 'object'
                    ? JSON.stringify(item)
                    : String(item);

                return itemStr.length > maxArrayItemLength
                    ? `${itemStr.substring(0, maxArrayItemLength)}...`
                    : itemStr;
            });

            const hasMore = value.length > maxArrayLength;
            return `[${items.join(', ')}${hasMore ? `, ... (${value.length - maxArrayLength} more)` : ''}]`;
        }

        // Handle objects
        if (typeof value === 'object') {
            // Handle file objects
            if (schema?.type === 'file' && value.file_id) {
                return `File: ${value.name || value.file_id}`;
            }

            // Handle schema objects with improved field name display
            if (schema?.type === 'object' && schema.fields) {
                // Format object with field names clearly visible
                const formattedEntries = Object.entries(value)
                    .filter(([key]) => schema.fields && key in schema.fields)
                    .map(([key, val]) => {
                        const fieldSchema = schema.fields?.[key];
                        const fieldValue = this.formatValueForDisplay(
                            val,
                            fieldSchema,
                            {
                                maxTextLength: Math.min(50, maxTextLength / 2),
                                maxArrayLength: 2,
                                maxArrayItemLength: 30
                            }
                        );
                        return `"${key}": ${fieldValue}`;
                    });

                const formatted = `{ ${formattedEntries.join(', ')} }`;
                if (formatted.length > maxTextLength) {
                    return `${formatted.substring(0, maxTextLength)}...`;
                }
                return formatted;
            }

            // Handle other objects
            const json = JSON.stringify(value, null, 2);
            if (json.length > maxTextLength) {
                return `${json.substring(0, maxTextLength)}...`;
            }
            return json;
        }

        // Handle strings
        if (typeof value === 'string') {
            if (value.length > maxTextLength) {
                return `${value.substring(0, maxTextLength)}...`;
            }
            return value;
        }

        // Handle other primitives
        return String(value);
    }

    /**
     * Gets output values for a step formatted for UI display
     */
    static getStepOutputValuesForUI(
        step: WorkflowStep,
        workflow: Workflow | null
    ): Record<string, { value: any, schema: any }> {
        if (!step.output_mappings || !workflow?.state) return {};

        const result: Record<string, { value: any, schema: any }> = {};

        Object.entries(step.output_mappings).forEach(([outputName, varName]) => {
            const variable = workflow.state?.find(v => v.name === varName);

            result[outputName] = {
                value: variable?.value,
                schema: variable?.schema
            };
        });

        return result;
    }

    /**
     * Resolves parameter mappings for a workflow step
     */
    private static getResolvedParameters(
        step: WorkflowStep,
        workflow: Workflow
    ): Record<ToolParameterName, SchemaValueType> {
        const parameters: Record<ToolParameterName, SchemaValueType> = {};

        if (!step.parameter_mappings) return parameters;

        const allVariables = workflow.state || [];
        for (const [paramName, varNamePath] of Object.entries(step.parameter_mappings)) {
            // Use the utility library to resolve variable paths
            const { value, validPath, errorMessage } = resolveVariablePath(allVariables, varNamePath.toString());

            if (validPath && value !== undefined) {
                parameters[paramName as ToolParameterName] = value as SchemaValueType;
            } else {
                console.warn(`Invalid or undefined variable path: ${varNamePath}`, errorMessage ? `Error: ${errorMessage}` : '');
            }
        }

        return parameters;
    }

    /**
     * Updates workflow state with tool results
     */
    private static getUpdatedWorkflowStateFromResults(
        step: WorkflowStep,
        outputs: Record<string, any>,
        workflow: Workflow
    ): WorkflowVariable[] {
        if (!step.output_mappings) return workflow.state || [];

        const updatedState = [...(workflow.state || [])];

        // If step is type tool, we need to update the outputs with the tool results
        if (step.step_type === WorkflowStepType.ACTION) {
            for (const [outputPath, varName] of Object.entries(step.output_mappings)) {
                // Parse the output path to extract a specific value from the tool output
                const { rootName: rootOutputName, propPath: outputPropPath } = parseVariablePath(outputPath.toString());

                // Start with the root output value
                let outputValue = outputs[rootOutputName as ToolOutputName];

                // If we have a path within the output, resolve it to get the specific value
                if (outputPropPath.length > 0 && outputValue !== undefined) {
                    const { value, validPath, errorMessage } = resolvePropertyPath(outputValue, outputPropPath);

                    if (validPath) {
                        outputValue = value;
                    } else {
                        console.warn(`Invalid output property path: ${outputPath}. Using undefined value.`,
                            errorMessage ? `Error: ${errorMessage}` : '');
                        outputValue = undefined;
                    }
                }

                // Find the variable to store the result in
                const outputVarIndex = updatedState.findIndex(v => v.name === varName);

                if (outputVarIndex !== -1) {
                    // Store the entire (possibly resolved) output value in the variable
                    updatedState[outputVarIndex] = {
                        ...updatedState[outputVarIndex],
                        value: outputValue
                    };
                }
            }
        }
        // If step is type evaluation, we need to update the outputs with the evaluation result
        else if (step.step_type === WorkflowStepType.EVALUATION) {
            console.log('Updating evaluation outputs:', workflow.state);
            // Generate a shorter variable ID using first 8 chars of step ID plus _eval
            const shortStepId = step.step_id.slice(0, 8);
            const outputVarName = `eval_${shortStepId}` as WorkflowVariableName;

            // Check if the output variable already exists
            const outputVarIndex = updatedState.findIndex(v => v.name === outputVarName);
            if (outputVarIndex !== -1) {
                updatedState[outputVarIndex] = {
                    ...updatedState[outputVarIndex],
                    // NOTE: We're only storing the outputs object here, not the full EvaluationResult.
                    // This is why in EvaluationStepRunner we cast the value to EvaluationOutputs.
                    value: outputs
                };
            } else {
                updatedState.push({
                    name: outputVarName,
                    variable_id: outputVarName,
                    description: 'Evaluation step result',
                    schema: {
                        type: 'object',
                        is_array: false
                    },
                    // NOTE: We're only storing the outputs object here, not the full EvaluationResult.
                    // This is why in EvaluationStepRunner we cast the value to EvaluationOutputs.
                    value: outputs,
                    io_type: 'evaluation'
                });
            }
        }

        console.log('Updated state:', updatedState);
        return updatedState;
    }

    /**
     * Evaluates conditions for a workflow step
     */
    private static evaluateConditions(
        step: WorkflowStep,
        workflow: Workflow
    ): EvaluationResult {
        if (!step.evaluation_config) {
            return {
                success: false,
                error: 'No evaluation configuration found',
                next_action: 'end'
            };
        }

        const variables = new Map<WorkflowVariableName, any>();
        (workflow.state || []).forEach(variable => {
            variables.set(variable.name, variable.value);
        });

        // Get current jump count
        const jumpCounterName = `jump_count_${step.step_id.slice(0, 8)}` as WorkflowVariableName;
        let jumpCount = 0;
        const jumpCountVar = workflow.state?.find(v => v.name === jumpCounterName);
        if (jumpCountVar?.value !== undefined) {
            jumpCount = Number(jumpCountVar.value);
        }

        // Check if we've reached the maximum jumps limit
        const maxJumps = step.evaluation_config.maximum_jumps || 3; // Default to 3 if not specified
        const maxJumpsReached = jumpCount >= maxJumps;

        // Find first matching condition
        let metCondition = null;
        for (const condition of step.evaluation_config.conditions) {
            const variableValue = variables.get(condition.variable);
            if (variableValue === undefined) continue;

            if (this.evaluateCondition(condition.operator, variableValue, condition.value)) {
                metCondition = {
                    condition,
                    value: variableValue
                };
                break;
            }
        }

        // Return evaluation result that matches the EvaluationResult interface
        if (metCondition && !maxJumpsReached) {
            return {
                success: true,
                outputs: {
                    ['condition_met' as WorkflowVariableName]: metCondition.condition.condition_id as SchemaValueType,
                    ['variable_name' as WorkflowVariableName]: metCondition.condition.variable as SchemaValueType,
                    ['variable_value' as WorkflowVariableName]: String(metCondition.value) as SchemaValueType,
                    ['operator' as WorkflowVariableName]: metCondition.condition.operator as SchemaValueType,
                    ['comparison_value' as WorkflowVariableName]: String(metCondition.condition.value) as SchemaValueType,
                    ['reason' as WorkflowVariableName]: `Condition '${metCondition.condition.condition_id}' was met` as SchemaValueType,
                    ['next_action' as WorkflowVariableName]: 'jump' as SchemaValueType,
                    ['target_step_index' as WorkflowVariableName]: String(metCondition.condition.target_step_index) as SchemaValueType,
                    ['jump_count' as WorkflowVariableName]: String(jumpCount) as SchemaValueType,
                    ['max_jumps' as WorkflowVariableName]: String(maxJumps) as SchemaValueType
                },
                next_action: 'jump',
                target_step_index: metCondition.condition.target_step_index,
                reason: `Condition '${metCondition.condition.condition_id}' was met`
            };
        } else if (metCondition && maxJumpsReached) {
            // Condition met but max jumps reached
            return {
                success: true,
                outputs: {
                    ['condition_met' as WorkflowVariableName]: metCondition.condition.condition_id as SchemaValueType,
                    ['variable_name' as WorkflowVariableName]: metCondition.condition.variable as SchemaValueType,
                    ['variable_value' as WorkflowVariableName]: String(metCondition.value) as SchemaValueType,
                    ['operator' as WorkflowVariableName]: metCondition.condition.operator as SchemaValueType,
                    ['comparison_value' as WorkflowVariableName]: String(metCondition.condition.value) as SchemaValueType,
                    ['reason' as WorkflowVariableName]: `Condition '${metCondition.condition.condition_id}' was met but maximum jumps (${maxJumps}) reached` as SchemaValueType,
                    ['next_action' as WorkflowVariableName]: 'continue' as SchemaValueType,
                    ['jump_count' as WorkflowVariableName]: String(jumpCount) as SchemaValueType,
                    ['max_jumps' as WorkflowVariableName]: String(maxJumps) as SchemaValueType,
                    ['max_jumps_reached' as WorkflowVariableName]: 'true' as SchemaValueType
                },
                next_action: 'continue',
                reason: `Condition '${metCondition.condition.condition_id}' was met but maximum jumps (${maxJumps}) reached`
            };
        } else {
            return {
                success: true,
                outputs: {
                    ['condition_met' as WorkflowVariableName]: 'none' as SchemaValueType,
                    ['reason' as WorkflowVariableName]: 'No conditions met - continuing to next step' as SchemaValueType,
                    ['jump_count' as WorkflowVariableName]: String(jumpCount) as SchemaValueType,
                    ['max_jumps' as WorkflowVariableName]: String(maxJumps) as SchemaValueType
                },
                next_action: step.evaluation_config.default_action as 'continue' | 'end',
                reason: 'No conditions were met'
            };
        }
    }

    /**
     * Evaluates a single condition with proper type handling
     */
    private static evaluateCondition(
        operator: EvaluationOperator,
        value: SchemaValueType,
        compareValue: SchemaValueType
    ): boolean {

        // Handle null/undefined values
        if (value === null || value === undefined || compareValue === null || compareValue === undefined) {
            return false;
        }

        try {
            switch (operator) {
                case 'equals':
                    // Use strict equality after converting to same type if needed
                    if (typeof value === 'number' && typeof compareValue === 'string') {
                        return value === Number(compareValue);
                    }
                    if (typeof value === 'string' && typeof compareValue === 'number') {
                        return Number(value) === compareValue;
                    }
                    return value === compareValue;

                case 'not_equals':
                    // Reuse equals logic
                    return !this.evaluateCondition('equals', value, compareValue);

                case 'greater_than':
                    // Ensure numeric comparison
                    const numValue = typeof value === 'string' ? Number(value) : value;
                    const numCompare = typeof compareValue === 'string' ? Number(compareValue) : compareValue;
                    if (typeof numValue !== 'number' || typeof numCompare !== 'number' || isNaN(numValue) || isNaN(numCompare)) {
                        return false;
                    }
                    return numValue > numCompare;

                case 'less_than':
                    // Reuse greater_than logic
                    return this.evaluateCondition('greater_than', compareValue, value);

                case 'contains':
                    // Only allow string contains operations
                    if (typeof value !== 'string' || typeof compareValue !== 'string') {
                        return false;
                    }
                    return value.includes(compareValue);

                case 'not_contains':
                    // Reuse contains logic
                    return !this.evaluateCondition('contains', value, compareValue);

                default:
                    console.warn(`Unknown operator: ${operator}`);
                    return false;
            }
        } catch (error) {
            console.error('Error in condition evaluation:', error);
            return false;
        }
    }

    /**
     * Manages jump count for an evaluation step
     */
    private static manageJumpCount(
        step: WorkflowStep,
        currentState: WorkflowVariable[],
        fromStepIndex: number,
        toStepIndex: number,
        reason?: string
    ): {
        jumpCount: number,
        canJump: boolean,
        updatedState: WorkflowVariable[],
        jumpInfo: any
    } {
        const shortStepId = step.step_id.slice(0, 8);
        const jumpCounterName = `jump_count_${shortStepId}` as WorkflowVariableName;
        let jumpCount = 0;

        // Look for existing jump counter
        const jumpCountVar = currentState.find(v => v.name === jumpCounterName);
        if (jumpCountVar?.value !== undefined) {
            jumpCount = Number(jumpCountVar.value);
        }

        // Get maximum allowed jumps
        const maxJumps = step.evaluation_config?.maximum_jumps || 3;

        // Check if we can jump (jumpCount is less than maxJumps)
        const canJump = jumpCount < maxJumps;

        console.log('Jump Count Management:', {
            stepId: step.step_id,
            currentJumpCount: jumpCount,
            maxJumps,
            canJump,
            fromStep: fromStepIndex,
            toStep: toStepIndex
        });

        // Create updated state with new jump count
        const updatedState = [...currentState];
        const jumpCountVarIndex = updatedState.findIndex(v => v.name === jumpCounterName);

        if (canJump) {
            // Always increment counter if we can jump - this is now only called from executeStepSimple
            if (jumpCountVarIndex !== -1) {
                updatedState[jumpCountVarIndex] = {
                    ...updatedState[jumpCountVarIndex],
                    value: jumpCount + 1
                };
            } else {
                updatedState.push({
                    name: jumpCounterName,
                    variable_id: jumpCounterName,
                    description: 'Jump counter for evaluation step',
                    schema: {
                        type: 'number',
                        is_array: false
                    },
                    value: 1,
                    io_type: 'evaluation'
                });
            }
        }

        // Create jump info object
        const jumpInfo = {
            is_jump: canJump,
            from_step: fromStepIndex,
            to_step: canJump ? toStepIndex : fromStepIndex + 1,
            reason: canJump
                ? (reason || 'Jump condition met')
                : `Maximum jumps (${maxJumps}) reached. Continuing to next step.`
        };

        console.log('Jump Decision:', {
            canJump,
            newJumpCount: canJump ? jumpCount + 1 : jumpCount,
            nextStep: jumpInfo.to_step,
            reason: jumpInfo.reason
        });

        return {
            jumpCount,
            canJump,
            updatedState,
            jumpInfo
        };
    }

    /**
     * Executes a workflow step and returns the updated workflow and execution result
     * This is a simplified API that returns the updated workflow instead of using callbacks
     */
    static async executeStepSimple(
        workflow: Workflow,
        stepIndex: number
    ): Promise<{
        updatedState: WorkflowVariable[],
        result: StepExecutionResult,
        nextStepIndex: number
    }> {
        try {
            // Get the step from workflow
            const step = workflow.steps[stepIndex];
            console.log('executeStepSimple called for step:', step);

            if (!step) {
                return {
                    updatedState: workflow.state || [],
                    result: {
                        success: false,
                        error: 'Invalid step index'
                    },
                    nextStepIndex: stepIndex + 1
                };
            }

            // Create a copy of the workflow state to avoid mutating the original
            const workflowStateCopy = [...(workflow.state || [])];

            // Clear any existing outputs for this step
            const clearedState = this.clearStepOutputs(step, { ...workflow, state: workflowStateCopy });

            // Execute based on step type
            let result: StepExecutionResult;
            let updatedState = clearedState;
            let nextStepIndex = stepIndex + 1; // Default to next step

            if (step.step_type === WorkflowStepType.EVALUATION) {
                // For evaluation, we need the workflow context to evaluate conditions
                const workflowCopy = { ...workflow, state: clearedState };
                result = this.evaluateConditions(step, workflowCopy);

                // Update workflow state with evaluation results
                if (result.success && result.outputs) {
                    updatedState = this.getUpdatedWorkflowStateFromResults(
                        step,
                        result.outputs,
                        workflowCopy
                    );
                }

                // Handle jump logic
                if (result.outputs &&
                    result.outputs['next_action' as WorkflowVariableName] === 'jump' &&
                    result.outputs['target_step_index' as WorkflowVariableName] !== undefined) {

                    const targetStepIndex = Number(result.outputs['target_step_index' as WorkflowVariableName]);
                    const jumpReason = result.outputs['reason' as WorkflowVariableName] as string;

                    // Use shared jump count management and increment counter if we can jump
                    const jumpResult = this.manageJumpCount(
                        step,
                        updatedState,
                        stepIndex,
                        targetStepIndex,
                        jumpReason
                    );

                    // Update state and determine next step
                    updatedState = jumpResult.updatedState;
                    nextStepIndex = jumpResult.canJump ? targetStepIndex : stepIndex + 1;

                    // Update result outputs with jump info
                    result.outputs = {
                        ...result.outputs,
                        ['next_action' as WorkflowVariableName]: (jumpResult.canJump ? 'jump' : 'continue') as SchemaValueType,
                        ['max_jumps_reached' as WorkflowVariableName]: (!jumpResult.canJump).toString() as SchemaValueType,
                        ['_jump_info' as WorkflowVariableName]: JSON.stringify(jumpResult.jumpInfo) as SchemaValueType
                    };
                }
            } else {
                // Execute tool step
                if (!step.tool) {
                    return {
                        updatedState: clearedState,
                        result: {
                            success: false,
                            error: 'No tool configured for this step'
                        },
                        nextStepIndex: stepIndex + 1
                    };
                }

                // For tool execution, we need the workflow context to resolve parameters
                const workflowCopy = { ...workflow, state: clearedState };
                const parameters = this.getResolvedParameters(step, workflowCopy);

                // Add prompt template ID for LLM tools
                if (step.tool.tool_type === 'llm' && step.prompt_template_id) {
                    parameters['prompt_template_id' as ToolParameterName] = step.prompt_template_id as SchemaValueType;
                }

                // Execute the tool
                const toolResult = await ToolEngine.executeTool(step.tool, parameters);

                // Update workflow state with tool results
                if (toolResult) {
                    updatedState = this.getUpdatedWorkflowStateFromResults(
                        step,
                        toolResult,
                        workflowCopy
                    );
                }

                result = {
                    success: true,
                    outputs: toolResult
                };
            }

            return {
                updatedState,
                result,
                nextStepIndex
            };
        } catch (error) {
            return {
                updatedState: workflow.state || [],
                result: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                },
                nextStepIndex: stepIndex + 1
            };
        }
    }

    /**
     * Clears outputs for a step before execution
     * Returns the updated state array
     */
    private static clearStepOutputs(
        step: WorkflowStep,
        workflow: Workflow
    ): WorkflowVariable[] {
        if (!workflow.state) return [];

        return workflow.state.map(variable => {
            // Clear mapped outputs
            if (step.output_mappings && Object.values(step.output_mappings).includes(variable.name)) {
                return { ...variable, value: undefined };
            }

            // Clear evaluation-specific outputs
            if (step.step_type === WorkflowStepType.EVALUATION &&
                variable.name === `eval_${step.step_id.slice(0, 8)}`) {
                return { ...variable, value: undefined };
            }

            return variable;
        });
    }

    /**
     * Gets the next step index based on the current step and workflow state
     * For evaluation steps, this may involve jumping to a specific step
     * based on the evaluation result
     * 
     * @returns An object containing the next step index and the updated workflow
     */
    static getNextStepIndex(
        workflow: Workflow,
        currentStepIndex: number
    ): { nextStepIndex: number, updatedState: WorkflowVariable[] } {
        console.log('getNextStepIndex called with workflow:', workflow);
        console.log('Current step index:', currentStepIndex);

        // Create a copy of the workflow state to avoid mutating the original
        const workflowStateCopy = [...(workflow.state || [])];

        // Basic validation checks
        const currentStep = workflow.steps[currentStepIndex];
        if (!currentStep) {
            console.warn('Invalid step index or no current step found');
            return { nextStepIndex: currentStepIndex, updatedState: workflowStateCopy };
        }

        // First check if this is NOT an evaluation step - handle the simple case first
        if (currentStep.step_type !== WorkflowStepType.EVALUATION) {
            return { nextStepIndex: currentStepIndex + 1, updatedState: workflowStateCopy };
        }

        // For evaluation steps, check the evaluation result to see what executeStepSimple decided
        const shortStepId = currentStep.step_id.slice(0, 8);
        const evalVarName = `eval_${shortStepId}`;

        const evalResult = workflowStateCopy.find(
            o => o.name === evalVarName
        )?.value as EvaluationResult | undefined;

        // If there's a jump decision and it wasn't blocked by jump count (which executeStepSimple already checked)
        if (evalResult?.next_action === 'jump' &&
            evalResult?.target_step_index !== undefined) {

            console.log('Found jump decision:', evalResult);

            // Get the jump info from the outputs
            const jumpValue = workflowStateCopy.find(
                o => o.name === `_jump_info_${shortStepId}`
            )?.value as string | undefined;
            console.log('Jump info:', jumpValue);

            // compare the jumpVar to the evalResult._jump_info
            if (jumpValue && Number(jumpValue) < Number(evalResult.outputs?.['max_jumps' as WorkflowVariableName])) {
                console.log('Jump was approved, using target step index:', evalResult.target_step_index);
                return {
                    nextStepIndex: Number(evalResult.target_step_index),
                    updatedState: workflowStateCopy
                };
            }


            console.log('Jump was approved, using target step index:', evalResult.target_step_index);
            // Jump was approved by executeStepSimple, so use its target
            return {
                nextStepIndex: Number(evalResult.target_step_index),
                updatedState: workflowStateCopy
            }
        }

        console.log('No jump or jump was blocked, continuing to next step');
        // No jump or jump was blocked, continue to next step
        return { nextStepIndex: currentStepIndex + 1, updatedState: workflowStateCopy };
    }

    /**
     * Resets all jump counters in the workflow state
     * This should be called when starting a new workflow execution
     * 
     * @deprecated This method is deprecated. Use the RESET_WORKFLOW_STATE action type instead.
     */
    static resetJumpCounters(
        workflow: Workflow,
        updateWorkflowByAction: (action: WorkflowStateAction) => void
    ): void {
        console.warn('resetJumpCounters is deprecated. Use the RESET_WORKFLOW_STATE action type with keepJumpCounters set to false instead.');

        if (!workflow.state) return;

        updateWorkflowByAction({
            type: 'RESET_WORKFLOW_STATE',
            payload: {
                keepJumpCounters: false
            }
        });

        console.log('Reset all jump counters for workflow execution');
    }

    /**
     * Updates workflow state based on an action
     */
    static updateWorkflowByAction(workflow: Workflow, action: WorkflowStateAction): Workflow {
        switch (action.type) {
            case 'UPDATE_WORKFLOW':
                if (!action.payload.workflowUpdates) return workflow;

                // Handle state updates specially to ensure we don't lose data
                if (action.payload.workflowUpdates.state) {
                    // Validate variable name uniqueness
                    const names = new Set<string>();
                    for (const variable of action.payload.workflowUpdates.state) {
                        if (names.has(variable.name)) {
                            console.error(`Duplicate variable name found: ${variable.name}`);
                            return workflow;
                        }
                        names.add(variable.name);
                    }

                    // Ensure variable_id is set for all variables
                    const processedState = action.payload.workflowUpdates.state.map(variable => ({
                        ...variable,
                        variable_id: variable.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));

                    return {
                        ...workflow,
                        ...action.payload.workflowUpdates,
                        state: processedState
                    };
                }

                // For updates without state changes
                return {
                    ...workflow,
                    ...action.payload.workflowUpdates
                };

            case 'UPDATE_STEP':
                if (!action.payload.stepId || !action.payload.step) return workflow;
                return {
                    ...workflow,
                    steps: workflow.steps.map(step =>
                        step.step_id === action.payload.stepId ? action.payload.step! : step
                    )
                };

            case 'ADD_STEP':
                const newStep = WorkflowEngine.createNewStep(workflow);
                return {
                    ...workflow,
                    steps: [...workflow.steps, newStep]
                };

            case 'DELETE_STEP':
                if (!action.payload.stepId) return workflow;
                return {
                    ...workflow,
                    steps: workflow.steps.filter(step => step.step_id !== action.payload.stepId)
                };

            case 'REORDER_STEPS':
                if (!action.payload.reorder) return workflow;
                // Update sequence numbers for the reordered steps
                const updatedSteps = action.payload.reorder.reorderedSteps.map((step, index) => ({
                    ...step,
                    sequence_number: index
                }));
                return {
                    ...workflow,
                    steps: updatedSteps
                };

            case 'UPDATE_STATE':
                if (!action.payload.state) return workflow;
                // Validate variable name uniqueness
                const names = new Set<string>();
                for (const variable of action.payload.state) {
                    if (names.has(variable.name)) {
                        console.error(`Duplicate variable name found: ${variable.name}`);
                        return workflow;
                    }
                    names.add(variable.name);
                }
                return {
                    ...workflow,
                    state: action.payload.state
                };

            case 'RESET_EXECUTION':
                // This action resets all variable values while preserving the variables themselves
                // It's used as part of the workflow reset process
                return {
                    ...workflow,
                    state: workflow.state?.map(variable => {
                        // Reset all variable values to undefined
                        return { ...variable, value: undefined };
                    }) || []
                };

            case 'RESET_WORKFLOW_STATE':
                if (!workflow.state) return workflow;

                // First, handle the basic reset execution which clears values but keeps variables
                let updatedState = workflow.state.map(variable => ({
                    ...variable,
                    value: undefined
                }));

                // Then, if we're not keeping jump counters, filter them out
                if (!action.payload.keepJumpCounters) {
                    updatedState = updatedState.filter(variable =>
                        // Remove all evaluation variables including jump counters
                        variable.io_type !== 'evaluation' &&
                        !variable.name.startsWith('jump_count_') &&
                        !variable.name.startsWith('eval_')
                    );
                }

                return {
                    ...workflow,
                    state: updatedState
                };

            default:
                // Handle existing step update cases
                return {
                    ...workflow,
                    steps: workflow.steps.map(step => {
                        if (step.step_id === action.payload.stepId) {
                            switch (action.type) {
                                case 'UPDATE_PARAMETER_MAPPINGS':
                                    return {
                                        ...step,
                                        parameter_mappings: action.payload.mappings as Record<ToolParameterName, WorkflowVariableName>
                                    };
                                case 'UPDATE_OUTPUT_MAPPINGS':
                                    return {
                                        ...step,
                                        output_mappings: action.payload.mappings as Record<ToolOutputName, WorkflowVariableName>
                                    };
                                case 'UPDATE_STEP_TOOL':
                                    return {
                                        ...step,
                                        tool: action.payload.tool,
                                        tool_id: action.payload.tool?.tool_id,
                                        // Clear mappings when tool changes
                                        parameter_mappings: {},
                                        output_mappings: {},
                                        // Clear prompt template when tool changes
                                        prompt_template_id: undefined
                                    };
                                case 'UPDATE_STEP_TYPE':
                                    const newType = step.step_type === WorkflowStepType.ACTION
                                        ? WorkflowStepType.EVALUATION
                                        : WorkflowStepType.ACTION;

                                    return {
                                        ...step,
                                        step_type: newType,
                                        // Clear tool-specific data when switching to evaluation
                                        ...(step.step_type === WorkflowStepType.ACTION ? {
                                            tool: undefined,
                                            tool_id: undefined,
                                            parameter_mappings: {},
                                            output_mappings: {},
                                            prompt_template_id: undefined,
                                            evaluation_config: {
                                                conditions: [],
                                                default_action: 'continue',
                                                maximum_jumps: 3
                                            }
                                        } : {})
                                    };
                                default:
                                    return step;
                            }
                        }
                        return step;
                    })
                };
        }
    }

    /**
     * Executes a workflow step and manages workflow state
     * @deprecated Use executeStepSimple instead for a more straightforward API
     */
    static async executeStep(
        workflow: Workflow,
        stepIndex: number,
        updateWorkflowByAction: (action: WorkflowStateAction) => void
    ): Promise<StepExecutionResult> {
        try {
            console.log('executeStep called (deprecated) - consider using executeStepSimple instead');

            // Use the new simplified implementation
            const { updatedState, result, nextStepIndex } = await this.executeStepSimple(workflow, stepIndex);

            // Update the workflow using the provided action handler
            if (updatedState !== workflow.state) {
                updateWorkflowByAction({
                    type: 'UPDATE_WORKFLOW',
                    payload: {
                        workflowUpdates: {
                            state: updatedState,
                            steps: workflow.steps
                        }
                    }
                });
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Updates a variable value with support for property paths
     */
    static updateVariableValue(
        variables: WorkflowVariable[],
        variablePath: string,
        value: SchemaValueType
    ): WorkflowVariable[] {
        const { rootName, propPath } = parseVariablePath(variablePath);

        // Create a copy of the variables array to avoid mutating the original
        const updatedVariables = [...variables];

        // Find the target variable
        const targetIndex = updatedVariables.findIndex(v => v.name === rootName);

        // If target variable doesn't exist, we can't update it
        if (targetIndex < 0) return variables;

        // Get a copy of the target variable
        const targetVariable = { ...updatedVariables[targetIndex] };

        // If there's no property path, just update the whole value
        if (propPath.length === 0) {
            targetVariable.value = value;
        } else {
            // If there's a property path, update that specific path in the object
            // First create a default value if none exists
            const currentValue = targetVariable.value !== undefined
                ? targetVariable.value
                : (targetVariable.schema.type === 'object' ? {} : undefined);

            // If we have a valid object to update
            if (currentValue !== undefined && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
                // Use utility to set value at property path
                targetVariable.value = setValueAtPath(currentValue, propPath, value);
            }
        }

        // Update the variable in the array
        updatedVariables[targetIndex] = targetVariable;

        return updatedVariables;
    }
} 