import {
    Job,
    JobStep,
    JobStatus,
    StepExecutionResult
} from '../../types/jobs';
import {
    WorkflowEngine
} from '../workflow/workflowEngine';
import {
    Workflow,
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    WorkflowStepType,
    WorkflowStatus,
    EvaluationResult,
    StepExecutionResult as WorkflowStepResult
} from '../../types/workflows';
import { SchemaValueType, ValueType } from '../../types/schema';

/**
 * JobState represents the combined state of a job's variables and execution progress
 */
export interface JobState {
    variables: Record<WorkflowVariableName, SchemaValueType>;
    stepResults: StepExecutionResult[];
    currentStepIndex: number;
}

/**
 * JobEngine is a wrapper around WorkflowEngine that operates on Job objects directly
 * This provides a cleaner interface for job execution and state management
 */
export class JobEngine {
    /**
     * Execute a single step of a job
     * @param job The job to execute
     * @param stepIndex The index of the step to execute
     * @param state The current job state
     * @returns The updated job state, step result, and next step index
     */
    static async executeStep(
        job: Job,
        stepIndex: number,
        state: JobState
    ): Promise<{
        updatedState: JobState;
        result: WorkflowStepResult;
        nextStepIndex: number;
    }> {
        try {
            // Convert job to workflow for WorkflowEngine
            const workflow = this.jobToWorkflow(job);

            // Execute the step using WorkflowEngine
            const { updatedState, result } = await WorkflowEngine.executeStepSimple(
                workflow,
                stepIndex
            );

            // Process evaluation step if needed
            const { nextStepIndex } = this.processEvaluationStep(
                job,
                stepIndex,
                updatedState,
                result
            );

            // Get next step index from WorkflowEngine (handles jump counters)
            const { nextStepIndex: confirmedNextStepIndex, updatedState: nextStepState } =
                WorkflowEngine.getNextStepIndex(workflow, stepIndex);

            // Create step execution record
            const stepExecutionResult: StepExecutionResult = {
                ...result,
                step_id: job.steps[stepIndex].step_id,
                started_at: job.steps[stepIndex].started_at || new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Return updated state and next step index
            return {
                updatedState: {
                    variables: this.workflowStateToJobVariables(nextStepState),
                    stepResults: [...state.stepResults, stepExecutionResult],
                    currentStepIndex: confirmedNextStepIndex
                },
                result,
                nextStepIndex: confirmedNextStepIndex
            };
        } catch (error) {
            // Handle step execution error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Create failed step result
            const failedResult: WorkflowStepResult = {
                success: false,
                error: errorMessage,
                outputs: {}
            };

            return {
                updatedState: {
                    ...state,
                    currentStepIndex: stepIndex + 1 // Move to next step by default
                },
                result: failedResult,
                nextStepIndex: stepIndex + 1
            };
        }
    }

    /**
     * Update a job with the results of a step execution
     * @param job The job to update
     * @param stepIndex The index of the step that was executed
     * @param result The result of the step execution
     * @param nextStepIndex The index of the next step to execute
     * @returns The updated job
     */
    static updateJobWithStepResult(
        job: Job,
        stepIndex: number,
        result: WorkflowStepResult,
        nextStepIndex: number
    ): Job {
        // Update the step with the result
        const updatedSteps = job.steps.map((step, idx) => {
            if (idx === stepIndex) {
                return {
                    ...step,
                    status: result.success ? JobStatus.COMPLETED : JobStatus.FAILED,
                    completed_at: new Date().toISOString(),
                    output_data: result.outputs || {},
                    error_message: result.success ? undefined : result.error
                };
            }
            return step;
        });

        // Update job execution progress
        return {
            ...job,
            execution_progress: {
                current_step: nextStepIndex,
                total_steps: job.steps.length
            },
            steps: updatedSteps
        };
    }

    /**
     * Update a job with new state variables
     * @param job The job to update
     * @param variables The new state variables as a record
     * @returns The updated job
     */
    static updateJobState(
        job: Job,
        variables: Record<WorkflowVariableName, SchemaValueType>
    ): Job {
        // Convert variables record to WorkflowVariable array
        const state = Object.entries(variables).map(([name, value]) => {
            // Determine the type safely
            let type: ValueType = 'string';
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
            else if (typeof value === 'object') type = 'object';

            return {
                name: name as WorkflowVariableName,
                variable_id: name,
                value: value,
                io_type: 'output' as const,
                schema: {
                    type,
                    is_array: Array.isArray(value)
                }
            };
        });

        return {
            ...job,
            state: state,
            // Also update legacy output_data for backward compatibility
            output_data: variables
        };
    }

    /**
     * Process an evaluation step to determine the next step index
     * @param job The job being executed
     * @param stepIndex The index of the current step
     * @param state The workflow state
     * @param stepResult The result of the step execution
     * @returns The next step index and jump information
     */
    private static processEvaluationStep(
        job: Job,
        stepIndex: number,
        state: WorkflowVariable[],
        stepResult: WorkflowStepResult
    ): {
        nextStepIndex: number;
        jumpInfo?: {
            is_jump: boolean;
            from_step: number;
            to_step: number;
            reason: string;
        };
    } {
        // Default to next step
        let nextStepIndex = stepIndex + 1;
        let jumpInfo;

        const isEvalStep = job.steps[stepIndex]?.step_type === WorkflowStepType.EVALUATION;

        if (isEvalStep) {
            // Find evaluation result in state
            const jobStepId = job.steps[stepIndex].step_id;
            if (jobStepId) {
                const shortStepId = jobStepId.slice(0, 8);
                const evalVarName = `eval_${shortStepId}`;
                const evalVar = state.find(v => v.name === evalVarName);

                if (evalVar && evalVar.value) {
                    const evalResult = evalVar.value as unknown as EvaluationResult;
                    if (evalResult.next_action === 'jump' && evalResult.target_step_index !== undefined) {
                        nextStepIndex = evalResult.target_step_index;
                    }
                }
            }

            // Create jump info
            const isJump = nextStepIndex !== stepIndex + 1;
            const evalOutput = stepResult.outputs || {};
            const reasonValue = evalOutput['reason' as WorkflowVariableName];
            const reason = typeof reasonValue === 'string' ? reasonValue : 'No reason provided';

            jumpInfo = {
                is_jump: isJump,
                from_step: stepIndex,
                to_step: nextStepIndex,
                reason: reason
            };

            // Add jump info to step result outputs
            if (stepResult.outputs) {
                (stepResult.outputs as any)._jump_info = jumpInfo;
            }
        }

        return { nextStepIndex, jumpInfo };
    }

    /**
     * Convert a job to a workflow for use with WorkflowEngine
     * @param job The job to convert
     * @returns A workflow representation of the job
     */
    static jobToWorkflow(job: Job): Workflow {
        // Convert job steps to workflow steps
        const workflowSteps = job.steps.map((step, index) => ({
            step_id: step.step_id,
            workflow_id: job.workflow_id,
            label: step.label,
            description: step.description,
            step_type: step.step_type,
            tool: step.tool,
            tool_id: step.tool_id,
            parameter_mappings: step.parameter_mappings || {},
            output_mappings: step.output_mappings || {},
            sequence_number: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            evaluation_config: step.evaluation_config,
            prompt_template_id: step.prompt_template_id
        })) as unknown as WorkflowStep[];

        // Create workflow
        return {
            workflow_id: job.workflow_id,
            name: job.name,
            description: job.description,
            status: WorkflowStatus.PUBLISHED,
            steps: workflowSteps,
            state: job.state || []
        };
    }

    /**
     * Convert workflow state to job variables
     * @param workflowState The workflow state
     * @returns Record of variable names to values
     */
    static workflowStateToJobVariables(
        workflowState: WorkflowVariable[]
    ): Record<WorkflowVariableName, SchemaValueType> {
        // Convert workflow state to job variables
        const variables: Record<WorkflowVariableName, SchemaValueType> = {};

        workflowState.forEach(variable => {
            if (variable.name) {
                variables[variable.name] = variable.value as SchemaValueType;
            }
        });

        return variables;
    }

    /**
     * Initialize a job with input variables
     * @param job The job to initialize
     * @param inputVariables The input variables
     * @returns The initialized job
     */
    static initializeJobWithInputs(
        job: Job,
        inputVariables: Record<WorkflowVariableName, SchemaValueType>
    ): Job {
        // Convert input variables to workflow variables
        const state = Object.entries(inputVariables).map(([name, value]) => {
            // Determine the type safely
            let type: ValueType = 'string';
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
            else if (typeof value === 'object') type = 'object';

            return {
                name: name as WorkflowVariableName,
                variable_id: name,
                value: value,
                io_type: 'input' as const,
                schema: {
                    type,
                    is_array: Array.isArray(value)
                }
            };
        });

        return {
            ...job,
            state: state
        };
    }
} 