import { Workflow, WorkflowVariable } from '../types/workflows';
import {
    WorkflowUpdate,
    StepUpdatePayload,
    VariableCreatePayload,
    ParameterMappingPayload,
    OutputMappingPayload,
    ReorderStepsPayload,
    ToolOutputsPayload
} from '../types/workflow-updates';

export class WorkflowUpdateManager {
    static applyUpdate(workflow: Workflow, update: WorkflowUpdate): Workflow {
        console.log('Applying update:', update);

        switch (update.type) {
            case 'UPDATE_STEP':
                return this.handleStepUpdate(workflow, update.payload as StepUpdatePayload);

            case 'CREATE_VARIABLE':
                return this.handleVariableCreate(workflow, update.payload as VariableCreatePayload);

            case 'UPDATE_PARAMETER_MAPPINGS':
                return this.handleParameterMappingUpdate(workflow, update.payload as ParameterMappingPayload);

            case 'UPDATE_OUTPUT_MAPPINGS':
                return this.handleOutputMappingUpdate(workflow, update.payload as OutputMappingPayload);

            case 'REORDER_STEPS':
                return this.handleStepReorder(workflow, update.payload as ReorderStepsPayload);

            case 'SET_TOOL_OUTPUTS':
                return this.handleToolOutputs(workflow, update.payload as ToolOutputsPayload);

            case 'LOAD_WORKFLOW':
                return update.payload as Workflow;

            default:
                console.warn('Unhandled update type:', update.type);
                return workflow;
        }
    }

    private static handleStepUpdate(workflow: Workflow, payload: StepUpdatePayload): Workflow {
        const { stepId, update } = payload;
        return {
            ...workflow,
            steps: workflow.steps.map(step =>
                step.step_id === stepId
                    ? { ...step, ...update }
                    : step
            )
        };
    }

    private static handleVariableCreate(workflow: Workflow, payload: VariableCreatePayload): Workflow {
        const { variable } = payload;
        const newVariable: WorkflowVariable = {
            ...variable,
            variable_id: variable.variable_id || `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        return {
            ...workflow,
            inputs: variable.io_type === 'input'
                ? [...(workflow.inputs || []), newVariable]
                : workflow.inputs,
            outputs: variable.io_type === 'output'
                ? [...(workflow.outputs || []), newVariable]
                : workflow.outputs
        };
    }

    private static handleParameterMappingUpdate(workflow: Workflow, payload: ParameterMappingPayload): Workflow {
        const { stepId, mappings } = payload;
        return {
            ...workflow,
            steps: workflow.steps.map(step =>
                step.step_id === stepId
                    ? {
                        ...step,
                        parameter_mappings: {
                            ...step.parameter_mappings,
                            ...mappings
                        }
                    }
                    : step
            )
        };
    }

    private static handleOutputMappingUpdate(workflow: Workflow, payload: OutputMappingPayload): Workflow {
        const { stepId, mappings } = payload;
        return {
            ...workflow,
            steps: workflow.steps.map(step =>
                step.step_id === stepId
                    ? {
                        ...step,
                        output_mappings: {
                            ...step.output_mappings,
                            ...mappings
                        }
                    }
                    : step
            )
        };
    }

    private static handleStepReorder(workflow: Workflow, payload: ReorderStepsPayload): Workflow {
        return {
            ...workflow,
            steps: payload.steps.map((step, index) => ({
                ...step,
                sequence_number: index
            }))
        };
    }

    private static handleToolOutputs(workflow: Workflow, payload: ToolOutputsPayload): Workflow {
        return {
            ...workflow,
            outputs: payload.outputs
        };
    }
} 