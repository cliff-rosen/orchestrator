import {
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    EvaluationOperator,
    StepExecutionResult,
    WorkflowStepType,
    Workflow,
    WorkflowStepId
} from '../../types/workflows';
import { ToolParameterName, ToolOutputName, Tool } from '../../types/tools';
import { SchemaValueType } from '../../types/schema';
import { ToolEngine } from '../tool/toolEngine';

export type StepReorderPayload = {
    reorderedSteps: WorkflowStep[];
};

type WorkflowStateAction = {
    type: 'UPDATE_PARAMETER_MAPPINGS' | 'UPDATE_OUTPUT_MAPPINGS' | 'UPDATE_STEP_TOOL' | 'UPDATE_STEP_TYPE' | 'ADD_STEP' | 'REORDER_STEPS' | 'DELETE_STEP' | 'UPDATE_STATE',
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
    private static getUpdatedWorkflowState(
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
            const outputVarName = `${shortStepId}_eval` as WorkflowVariableName;

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
                    io_type: 'output'
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
    ): StepExecutionResult {
        if (!step.evaluation_config) {
            return {
                success: false,
                error: 'No evaluation configuration found'
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

        // Return evaluation result
        const evalResult: Record<WorkflowVariableName, SchemaValueType> = metCondition ? {
            ['condition_met' as WorkflowVariableName]: metCondition.condition.condition_id as SchemaValueType,
            ['variable_name' as WorkflowVariableName]: metCondition.condition.variable as SchemaValueType,
            ['variable_value' as WorkflowVariableName]: String(metCondition.value) as SchemaValueType,
            ['operator' as WorkflowVariableName]: metCondition.condition.operator as SchemaValueType,
            ['comparison_value' as WorkflowVariableName]: String(metCondition.condition.value) as SchemaValueType,
            ['target_step_index' as WorkflowVariableName]: String(metCondition.condition.target_step_index) as SchemaValueType,
            ['next_step' as WorkflowVariableName]: String(metCondition.condition.target_step_index) as SchemaValueType,
            ['action' as WorkflowVariableName]: 'jump' as SchemaValueType
        } : {
            ['condition_met' as WorkflowVariableName]: 'none' as SchemaValueType,
            ['reason' as WorkflowVariableName]: 'No conditions met - continuing to next step' as SchemaValueType,
            ['target_step_index' as WorkflowVariableName]: '' as SchemaValueType,
            ['next_step' as WorkflowVariableName]: String(step.sequence_number + 1) as SchemaValueType,
            ['action' as WorkflowVariableName]: 'continue' as SchemaValueType
        };

        return {
            success: true,
            outputs: evalResult
        };
    }

    /**
     * Evaluates a single condition
     */
    private static evaluateCondition(
        operator: EvaluationOperator,
        value: any,
        compareValue: any
    ): boolean {
        switch (operator) {
            case 'equals':
                return value === compareValue;
            case 'not_equals':
                return value !== compareValue;
            case 'greater_than':
                return value > compareValue;
            case 'less_than':
                return value < compareValue;
            case 'contains':
                return String(value).includes(String(compareValue));
            case 'not_contains':
                return !String(value).includes(String(compareValue));
            default:
                return false;
        }
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

        // Update workflow state with tool results
        if (toolResult) {
            console.log('Updating workflow state with tool results:', toolResult);
            const updatedState = this.getUpdatedWorkflowState(step, toolResult, workflow);
            console.log('Updated state:', updatedState);
            updateWorkflow({ state: updatedState });
        }

        return {
            success: true,
            outputs: toolResult
        };
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
            const updatedState = this.getUpdatedWorkflowState(step, result.outputs, workflow);
            updateWorkflow({ state: updatedState });
        }

        return result;
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
                variable.name === `${step.step_id}_result`) {
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
        const currentStep = workflow.steps[currentStepIndex];
        if (!currentStep) return currentStepIndex;

        // For evaluation steps, check if we need to jump to a specific step
        if (currentStep.step_type === WorkflowStepType.EVALUATION) {
            // Find evaluation result in workflow outputs
            const evalResult = workflow.state?.find(
                o => o.name === `${currentStep.step_id}_result`
            )?.value as Record<string, string> | undefined;

            if (evalResult?.action === 'jump' && evalResult?.target_step_index) {
                // Convert target_step_index from string to number and adjust for input step offset
                const targetStep = parseInt(evalResult.target_step_index);

                // Validate target step index and adjust for input step offset
                if (!isNaN(targetStep) && targetStep >= 0 && targetStep < workflow.steps.length) {
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
                return {
                    ...workflow,
                    state: action.payload.state
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