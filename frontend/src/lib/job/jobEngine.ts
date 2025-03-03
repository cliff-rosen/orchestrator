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
            const { updatedState, result, nextStepIndex } = await WorkflowEngine.executeStepSimple(
                workflow,
                stepIndex
            );

            // Process evaluation step if needed to add jump info to the step result
            // This is now just for UI display purposes, as the actual next step is determined by executeStepSimple
            const jumpInfo = this.getJumpInfoFromResult(
                job,
                stepIndex,
                nextStepIndex,
                result
            );

            // Add jump info to the step result if it's an evaluation step
            if (jumpInfo && job.steps[stepIndex].step_type === WorkflowStepType.EVALUATION && result.outputs) {
                (result.outputs as any)._jump_info = jumpInfo;
            }

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
                    variables: this.workflowStateToJobVariables(updatedState),
                    stepResults: [...state.stepResults, stepExecutionResult],
                    currentStepIndex: nextStepIndex
                },
                result,
                nextStepIndex
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
     * Get jump information from a step result
     * This is used for UI display purposes
     */
    private static getJumpInfoFromResult(
        job: Job,
        stepIndex: number,
        nextStepIndex: number,
        stepResult: WorkflowStepResult
    ): {
        is_jump: boolean;
        from_step: number;
        to_step: number;
        reason: string;
    } | undefined {
        // Only process evaluation steps
        if (job.steps[stepIndex]?.step_type !== WorkflowStepType.EVALUATION) {
            return undefined;
        }

        // Check if this is a jump (not just going to the next step)
        const isJump = nextStepIndex !== stepIndex + 1;

        // Get reason from step result
        const outputs = stepResult.outputs || {};
        const reasonValue = outputs['reason' as WorkflowVariableName];
        const reason = typeof reasonValue === 'string' ? reasonValue : 'No reason provided';

        return {
            is_jump: isJump,
            from_step: stepIndex,
            to_step: nextStepIndex,
            reason
        };
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
        // Create a copy of the job to avoid mutating the original
        const updatedJob = { ...job };

        // Update the step with the result
        updatedJob.steps = [...job.steps];
        updatedJob.steps[stepIndex] = {
            ...updatedJob.steps[stepIndex],
            status: result.success ? JobStatus.COMPLETED : JobStatus.FAILED,
            completed_at: new Date().toISOString(),
            output_data: result.outputs || {},
            error_message: result.error
        };

        // Update job execution progress
        updatedJob.execution_progress = {
            current_step: nextStepIndex,
            total_steps: job.steps.length
        };

        // Update job status if all steps are completed or if there was an error
        if (nextStepIndex >= job.steps.length) {
            updatedJob.status = JobStatus.COMPLETED;
            updatedJob.completed_at = new Date().toISOString();
        } else if (!result.success) {
            updatedJob.status = JobStatus.FAILED;
            updatedJob.error_message = result.error;
        }

        return updatedJob;
    }

    /**
     * Update a job with new variables
     * @param job The job to update
     * @param variables The new variables
     * @returns The updated job
     */
    static updateJobState(
        job: Job,
        variables: Record<WorkflowVariableName, SchemaValueType>
    ): Job {
        // Convert variables to workflow variables
        const state = Object.entries(variables).map(([name, value]) => {
            // Find existing variable to preserve metadata
            const existingVar = job.state.find(v => v.name === name);
            if (existingVar) {
                return {
                    ...existingVar,
                    value
                };
            }

            // Determine the type safely for new variables
            let type: ValueType = 'string';
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
            else if (typeof value === 'object') type = 'object';

            // Create new variable
            return {
                name: name as WorkflowVariableName,
                variable_id: name,
                value: value,
                io_type: 'output' as const, // Assume new variables are outputs
                schema: {
                    type,
                    is_array: Array.isArray(value)
                }
            };
        });

        return {
            ...job,
            state
        };
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