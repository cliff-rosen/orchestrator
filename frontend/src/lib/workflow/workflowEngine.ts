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
import { SchemaValueType } from '../../types/schema';
import { ToolEngine } from '../tool/toolEngine';

export type StepReorderPayload = {
    reorderedSteps: WorkflowStep[];
};

export type WorkflowStateAction = {
    type: 'UPDATE_PARAMETER_MAPPINGS' | 'UPDATE_OUTPUT_MAPPINGS' | 'UPDATE_STEP_TOOL' | 'UPDATE_STEP_TYPE' | 'ADD_STEP' | 'REORDER_STEPS' | 'DELETE_STEP' | 'UPDATE_STATE' | 'RESET_EXECUTION',
    payload: {
        stepId?: string,
        mappings?: Record<ToolParameterName, WorkflowVariableName> | Record<ToolOutputName, WorkflowVariableName>,
        tool?: Tool,
        newStep?: WorkflowStep,
        reorder?: StepReorderPayload,
        state?: WorkflowVariable[]
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
     * Resolves parameter mappings for a workflow step
     */
    private static getResolvedParameters(
        step: WorkflowStep,
        workflow: Workflow
    ): Record<ToolParameterName, SchemaValueType> {
        const parameters: Record<ToolParameterName, SchemaValueType> = {};

        if (!step.parameter_mappings) return parameters;

        const allVariables = workflow.state || [];
        for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
            const variable = allVariables.find(v => v.name === varName);

            if (variable?.value !== undefined) {
                parameters[paramName as ToolParameterName] = variable.value as SchemaValueType;
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
            for (const [outputName, varName] of Object.entries(step.output_mappings)) {
                const value = outputs[outputName as ToolOutputName];
                const outputVarIndex = updatedState.findIndex(v => v.name === varName);

                if (outputVarIndex !== -1) {
                    updatedState[outputVarIndex] = {
                        ...updatedState[outputVarIndex],
                        value
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
        if (metCondition) {
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
                    ['target_step_index' as WorkflowVariableName]: String(metCondition.condition.target_step_index) as SchemaValueType
                },
                next_action: 'jump',
                target_step_index: metCondition.condition.target_step_index,
                reason: `Condition '${metCondition.condition.condition_id}' was met`
            };
        } else {
            return {
                success: true,
                outputs: {
                    ['condition_met' as WorkflowVariableName]: 'none' as SchemaValueType,
                    ['reason' as WorkflowVariableName]: 'No conditions met - continuing to next step' as SchemaValueType
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
     * Handles execution of an evaluation step
     */
    private static executeEvaluationStep(
        step: WorkflowStep,
        workflow: Workflow,
        updateWorkflow: (updates: Partial<Workflow>) => void
    ): StepExecutionResult {
        console.log('Executing evaluation step:', step.evaluation_config);

        const result = this.evaluateConditions(step, workflow);

        // Store evaluation result in workflow state
        if (result.success && result.outputs) {
            const updatedState = this.getUpdatedWorkflowStateFromResults(step, result.outputs, workflow);
            updateWorkflow({ state: updatedState });
        }

        return result;
    }

    /**
     * Handles execution of a tool step
     */
    private static async executeToolStep(
        step: WorkflowStep,
        workflow: Workflow,
        updateWorkflow: (updates: Partial<Workflow>) => void
    ): Promise<StepExecutionResult> {
        if (!step.tool) {
            return {
                success: false,
                error: 'No tool configured for this step'
            };
        }

        const parameters = this.getResolvedParameters(step, workflow);

        // Add prompt template ID for LLM tools
        if (step.tool.tool_type === 'llm' && step.prompt_template_id) {
            parameters['prompt_template_id' as ToolParameterName] = step.prompt_template_id as SchemaValueType;
        }

        // Execute the tool
        const toolResult = await ToolEngine.executeTool(step.tool, parameters);

        console.log("***********")
        console.log('executeToolStep called', toolResult);
        console.log("***********")

        // Update workflow state with tool results
        if (toolResult) {
            console.log('Updating workflow state with tool results:', toolResult);
            const updatedState = this.getUpdatedWorkflowStateFromResults(step, toolResult, workflow);
            console.log('Updated state:', updatedState);
            updateWorkflow({ state: updatedState });
        }

        return {
            success: true,
            outputs: toolResult
        };
    }

    /**
     * Clears outputs for a step before execution
     */
    private static clearStepOutputs(
        step: WorkflowStep,
        workflow: Workflow,
        updateWorkflow: (updates: Partial<Workflow>) => void
    ): void {
        if (!workflow.state) return;

        const updatedState = workflow.state.map(variable => {
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

        updateWorkflow({ state: updatedState });
    }

    /**
     * Executes a workflow step and manages workflow state
     */
    static async executeStep(
        workflow: Workflow,
        stepIndex: number,
        updateWorkflow: (updates: Partial<Workflow>) => void
    ): Promise<StepExecutionResult> {

        try {
            // Get the step from workflow
            const step = workflow.steps[stepIndex];

            console.log("***********")
            console.log('executeStep called', step);
            console.log("***********")

            if (!step) {
                return {
                    success: false,
                    error: 'Invalid step index'
                };
            }

            // Clear any existing outputs for this step
            this.clearStepOutputs(step, workflow, updateWorkflow);

            // Execute based on step type
            return step.step_type === WorkflowStepType.EVALUATION
                ? this.executeEvaluationStep(step, workflow, updateWorkflow)
                : await this.executeToolStep(step, workflow, updateWorkflow);

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Determines the next step index in the workflow based on current step and evaluation results
     * Only used in run mode to handle evaluation step jumps
     */
    static getNextStepIndex(
        workflow: Workflow,
        currentStepIndex: number
    ): number {

        const adjustedCurrentStepIndex = currentStepIndex - 1;
        if (adjustedCurrentStepIndex < 1) return 1;

        const currentStep = workflow.steps[adjustedCurrentStepIndex];
        if (!currentStep) return adjustedCurrentStepIndex;

        console.log('Current step:', currentStep);
        // For evaluation steps, check if we need to jump to a specific step
        if (currentStep.step_type === WorkflowStepType.EVALUATION) {
            console.log('Evaluating evaluation step:', currentStep.step_id);
            // Find evaluation result in workflow outputs
            const evalResult = workflow.state?.find(
                o => o.name === `eval_${currentStep.step_id.slice(0, 8)}`
            )?.value as EvaluationResult | undefined;

            if (evalResult?.next_action === 'jump' && evalResult?.target_step_index) {
                console.log('Jump action detected. Target step index:', evalResult.target_step_index);
                // Convert target_step_index from string to number and adjust for input step offset
                const targetStep = evalResult.target_step_index;

                // Validate target step index and adjust for input step offset
                if (targetStep >= 0 && targetStep < workflow.steps.length) {
                    console.log('Valid target step index. Returning:', targetStep + 1);
                    return targetStep + 1; // Add 1 to account for input step
                }
            }
        }

        // Default behavior - go to next step
        return currentStepIndex + 1;
    }

    /**
     * Updates workflow state based on an action
     */
    static updateWorkflowByAction(workflow: Workflow, action: WorkflowStateAction): Workflow {
        switch (action.type) {
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
                return {
                    ...workflow,
                    state: workflow.state?.map(variable => ({ ...variable, value: undefined }))
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
} 