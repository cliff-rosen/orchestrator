import {
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    EvaluationOperator,
    StepExecutionResult,
    WorkflowStepType,
    Workflow
} from '../../types/workflows';
import { ToolParameterName, ToolOutputName } from '../../types/tools';
import { SchemaValueType, ValueType } from '../../types/schema';
import { ToolEngine } from '../tool/toolEngine';

export class WorkflowEngine {
    /**
     * Resolves parameter mappings for a workflow step
     */
    private static getResolvedParameters(
        step: WorkflowStep,
        inputs: WorkflowVariable[],
        outputs: WorkflowVariable[]
    ): Record<ToolParameterName, SchemaValueType> {
        const parameters: Record<ToolParameterName, SchemaValueType> = {};

        if (!step.parameter_mappings) return parameters;

        for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
            const variable = inputs.find(v => v.name === varName) ||
                outputs.find(v => v.name === varName);

            if (variable?.value !== undefined) {
                parameters[paramName as ToolParameterName] = variable.value as SchemaValueType;
            }
        }

        return parameters;
    }

    /**
     * Updates workflow outputs with tool results
     */
    private static getUpdatedWorkflowOutputs(
        step: WorkflowStep,
        outputs: Record<string, any>,
        workflowOutputs: WorkflowVariable[]
    ): WorkflowVariable[] {
        if (!step.output_mappings) return workflowOutputs;

        // Deep copy the workflow outputs
        // const updatedOutputs = workflowOutputs.map(output => ({
        //     ...output,
        //     schema: { ...output.schema },
        //     value: output.value !== undefined ? JSON.parse(JSON.stringify(output.value)) : undefined
        // }));

        const updatedOutputs = workflowOutputs;
        for (const [outputName, varName] of Object.entries(step.output_mappings)) {
            const value = outputs[outputName as ToolOutputName];
            const outputVarIndex = updatedOutputs.findIndex(v => v.name === varName);

            if (outputVarIndex !== -1) {
                updatedOutputs[outputVarIndex] = {
                    ...updatedOutputs[outputVarIndex],
                    value
                };
            }
        }
        return updatedOutputs;
    }

    /**
     * Evaluates conditions for a workflow step
     */
    private static evaluateConditions(
        step: WorkflowStep,
        variables: Map<WorkflowVariableName, any>
    ): StepExecutionResult {
        if (!step.evaluation_config) {
            return {
                success: false,
                error: 'No evaluation configuration found'
            };
        }

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
     * Collects all available variables for evaluation
     */
    private static collectVariables(
        inputs: WorkflowVariable[],
        outputs: WorkflowVariable[]
    ): Map<WorkflowVariableName, any> {
        const variables = new Map<WorkflowVariableName, any>();

        inputs?.forEach(input => {
            variables.set(input.name, input.value);
        });

        outputs?.forEach(output => {
            variables.set(output.name, output.value);
        });

        return variables;
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

        const parameters = this.getResolvedParameters(step, workflow.inputs || [], workflow.outputs || []);

        // Add prompt template ID for LLM tools
        if (step.tool.tool_type === 'llm' && step.prompt_template_id) {
            parameters['prompt_template_id' as ToolParameterName] = step.prompt_template_id as SchemaValueType;
        }

        // Execute the tool
        const toolResult = await ToolEngine.executeTool(step.tool, parameters);

        // Update workflow outputs with tool results
        if (toolResult) {
            const updatedOutputs = this.getUpdatedWorkflowOutputs(step, toolResult, workflow.outputs || []);
            updateWorkflow({ outputs: updatedOutputs });
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
        const variables = this.collectVariables(workflow.inputs || [], workflow.outputs || []);
        const result = this.evaluateConditions(step, variables);

        // Store evaluation result in workflow outputs
        if (result.success && result.outputs) {
            const updatedOutputs = this.getUpdatedWorkflowOutputs(step, result.outputs, workflow.outputs || []);
            updateWorkflow({ outputs: updatedOutputs });
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
        if (!workflow.outputs) return;

        // Clear mapped outputs
        if (step.output_mappings) {
            const updatedOutputs = workflow.outputs.map(output => {
                if (Object.values(step.output_mappings!).includes(output.name)) {
                    return { ...output, value: undefined };
                }
                return output;
            });
            updateWorkflow({ outputs: updatedOutputs });
        }

        // Clear evaluation-specific outputs
        if (step.step_type === WorkflowStepType.EVALUATION) {
            const evaluationOutputName = `${step.step_id}_result`;
            const updatedOutputs = workflow.outputs.map(output => {
                if (output.name === evaluationOutputName) {
                    return { ...output, value: undefined };
                }
                return output;
            });
            updateWorkflow({ outputs: updatedOutputs });
        }
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
} 