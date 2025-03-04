import {
    Job,
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
    StepExecutionResult as WorkflowStepResult
} from '../../types/workflows';
import { Schema, SchemaValueType, ValueType } from '../../types/schema';

/**
 * JobState represents the combined state of a job's variables and execution progress
 */
export interface JobState {
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
     * @returns An object containing:
     *   - updatedState: The complete updated workflow state with all variable changes
     *   - result: The execution result for the step
     *   - nextStepIndex: The index of the next step to execute (may not be sequential for jumps)
     * 
     * Note: The updatedState contains all state changes including variable updates from tool outputs
     * and evaluation results. It should be used to update the job's state directly.
     */
    static async executeStep(
        job: Job,
        stepIndex: number
    ): Promise<{
        updatedState: WorkflowVariable[];
        result: StepExecutionResult;
        nextStepIndex: number;
    }> {
        try {
            // First check and fix any missing variables
            job = this.checkAndFixMissingVariables(job);

            // Validate variable mappings before execution
            const validationErrors = this.validateVariableMappings(job, stepIndex);
            if (validationErrors.length > 0) {
                throw new Error(`Variable mapping validation failed:\n${validationErrors.join('\n')}`);
            }

            // Convert job to workflow for WorkflowEngine
            const workflow = this.jobToWorkflow(job);

            // Execute the step using WorkflowEngine - this already handles all state updates and jump logic
            const { updatedState, result, nextStepIndex } = await WorkflowEngine.executeStepSimple(
                workflow,
                stepIndex
            );

            console.log('executeStep', {
                updatedState,
                result,
                nextStepIndex
            });

            // Create step execution record with proper job step result type
            const stepExecutionResult: StepExecutionResult = {
                ...result,
                step_id: job.steps[stepIndex].step_id,
                started_at: job.steps[stepIndex].started_at || new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Return the results directly from executeStepSimple
            return {
                updatedState,
                result: stepExecutionResult,
                nextStepIndex
            };
        } catch (error) {
            // Handle step execution error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Create failed step result with proper job step result type
            const failedResult: StepExecutionResult = {
                success: false,
                error: errorMessage,
                outputs: {},
                step_id: job.steps[stepIndex].step_id,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Return the current job state - this preserves all variables including evaluation variables
            return {
                updatedState: job.state,
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
    static getUpdatedJobWithStepResult(
        job: Job,
        stepIndex: number,
        result: WorkflowStepResult,
        nextStepIndex: number
    ): Job {
        // Create a copy of the job to avoid mutating the original
        const updatedJob = { ...job };

        // Create step execution record
        const stepExecutionResult: StepExecutionResult = {
            ...result,
            step_id: job.steps[stepIndex].step_id,
            started_at: job.steps[stepIndex].started_at || new Date().toISOString(),
            completed_at: new Date().toISOString()
        };

        // Update the step with the result
        updatedJob.steps = [...job.steps];
        updatedJob.steps[stepIndex] = {
            ...updatedJob.steps[stepIndex],
            status: result.success ? JobStatus.COMPLETED : JobStatus.FAILED,
            completed_at: new Date().toISOString(),
            error_message: result.error,
            latest_execution: stepExecutionResult,
            executions: [
                ...(updatedJob.steps[stepIndex].executions || []),
                stepExecutionResult
            ]
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

        // Process state variables, ensuring no duplicates
        const processedVarNames = new Set<string>();
        const workflowState: WorkflowVariable[] = [];

        // Include ALL variables from job state, regardless of type
        // This ensures evaluation variables and jump counters are preserved
        job.state.forEach(variable => {
            if (!processedVarNames.has(variable.name)) {
                processedVarNames.add(variable.name);
                workflowState.push(this.ensureWorkflowVariable(variable));
            }
        });

        // Create workflow
        return {
            workflow_id: job.workflow_id,
            name: job.name,
            description: job.description,
            status: WorkflowStatus.PUBLISHED,
            steps: workflowSteps,
            state: workflowState
        };
    }

    /**
     * Ensure a variable has all required workflow variable properties
     * Preserves the original io_type if present, especially important for evaluation variables
     */
    private static ensureWorkflowVariable(variable: Partial<WorkflowVariable>): WorkflowVariable {
        return {
            ...variable,
            variable_id: variable.variable_id || variable.name,
            schema: variable.schema || this.inferSchema(variable.value),
            io_type: variable.io_type || 'output'
        } as WorkflowVariable;
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
        // Validate input variables against job's input_variables definitions
        const errors: string[] = [];

        if (job.input_variables) {
            job.input_variables.forEach(inputVar => {
                const value = inputVariables[inputVar.name];

                // Check required inputs
                if (inputVar.required && (value === undefined || value === null)) {
                    errors.push(`Required input variable "${inputVar.name}" is missing`);
                    return;
                }

                // Check type compatibility if value is provided
                if (value !== undefined && value !== null) {
                    const valueSchema = this.inferSchema(value);
                    if (!this.isSchemaCompatible(inputVar.schema, valueSchema)) {
                        errors.push(`Input variable "${inputVar.name}" type mismatch - expected ${JSON.stringify(inputVar.schema)}, got ${JSON.stringify(valueSchema)}`);
                    }
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`Input validation failed:\n${errors.join('\n')}`);
        }

        // Start with existing non-input state variables
        const updatedState = job.state.filter(v => v.io_type !== 'input');

        // Convert and add input variables
        Object.entries(inputVariables).forEach(([name, value]) => {
            // Find existing variable definition
            const varDef = job.input_variables?.find(v => v.name === name);

            const inputVar = {
                name: name as WorkflowVariableName,
                variable_id: name,
                value: value,
                io_type: 'input' as const,
                schema: varDef?.schema || this.inferSchema(value)
            };

            updatedState.push(inputVar);
        });

        return {
            ...job,
            state: updatedState
        };
    }

    /**
     * Checks for missing variables in job state and attempts to fix them
     * @param job The job to check
     * @returns The job with fixed state if possible
     */
    static checkAndFixMissingVariables(job: Job): Job {
        // Create a map of all variables that should be created by output mappings
        const expectedVariables = new Map<string, { stepId: string, outputName: string }>();

        // Collect all output mappings from all steps
        job.steps.forEach(step => {
            if (step.output_mappings) {
                Object.entries(step.output_mappings).forEach(([outputName, varName]) => {
                    expectedVariables.set(varName as string, {
                        stepId: step.step_id,
                        outputName
                    });
                });
            }
        });

        // Check if any expected variables are missing from job state
        const missingVariables = Array.from(expectedVariables.keys())
            .filter(varName => !job.state.some(v => v.name === varName));

        if (missingVariables.length === 0) {
            return job; // No missing variables, return job as is
        }

        console.log('Found missing variables in job state:', missingVariables);

        // Create a copy of job state to modify
        const updatedState = [...job.state];

        // Add placeholder values for missing variables
        missingVariables.forEach(varName => {
            const { stepId, outputName } = expectedVariables.get(varName)!;
            console.log(`Adding placeholder for missing variable "${varName}" from step ${stepId}, output "${outputName}"`);

            // Create a placeholder variable with empty string value
            updatedState.push({
                name: varName as WorkflowVariableName,
                variable_id: varName,
                value: '',
                io_type: 'output',
                schema: { type: 'string', is_array: false }
            });
        });

        return {
            ...job,
            state: updatedState
        };
    }

    /**
     * Validates that all required variable mappings are present and of correct type
     * @param job The job to validate
     * @param stepIndex The index of the step to validate
     * @returns Array of validation errors, empty if valid
     */
    static validateVariableMappings(job: Job, stepIndex: number): string[] {
        // We no longer need to call checkAndFixMissingVariables here
        // since it's already called in executeStep

        const errors: string[] = [];
        const step = job.steps[stepIndex];

        if (!step.tool) return errors;

        // Debug logging to help diagnose the issue
        console.log(`Validating variable mappings for step ${stepIndex + 1} (${step.step_id}):`);
        console.log('- Parameter mappings:', step.parameter_mappings);
        console.log('- Current job state variables:', job.state.map(v => v.name));

        // Validate parameter mappings for the current step
        step.tool.signature.parameters.forEach(param => {
            const mappedVar = step.parameter_mappings[param.name];
            if (param.required && !mappedVar) {
                errors.push(`Step ${stepIndex + 1}: Required parameter "${param.name}" is not mapped`);
                return;
            }

            if (mappedVar) {
                const stateVar = job.state.find(v => v.name === mappedVar);

                // Check if the variable exists in job state
                if (!stateVar) {
                    errors.push(`Step ${stepIndex + 1}: Parameter "${param.name}" is mapped to variable "${mappedVar}" which does not exist in job state`);
                    console.log(`ERROR: Variable "${mappedVar}" not found in job state for parameter "${param.name}"`);
                } else if (!this.isSchemaCompatible(param.schema, stateVar.schema)) {
                    errors.push(`Step ${stepIndex + 1}: Parameter "${param.name}" type mismatch - expected ${JSON.stringify(param.schema)}, got ${JSON.stringify(stateVar.schema)}`);
                }
            }
        });

        return errors;
    }

    /**
     * Check if two schemas are compatible
     * Allows array of strings to be compatible with string by joining with newlines
     */
    private static isSchemaCompatible(schema1: Schema, schema2: Schema): boolean {
        // Special case: allow array of strings to be compatible with string
        if (schema1.type === 'string' && !schema1.is_array &&
            schema2.type === 'string' && schema2.is_array) {
            return true;
        }

        // Basic type compatibility
        if (schema1.type !== schema2.type) return false;

        // Array compatibility (except for the special case above)
        if (schema1.is_array !== schema2.is_array) return false;

        return true;
    }


    /**
     * Infer schema from a value
     */
    private static inferSchema(value: any): Schema {
        let type: ValueType = 'string';
        let isArray = Array.isArray(value);

        if (value !== null && value !== undefined) {
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
            else if (typeof value === 'object') {
                if (value && 'file_id' in value) {
                    type = 'file';
                } else if (!isArray) {
                    type = 'object';
                }
            }
        }

        return {
            type,
            is_array: isArray
        };
    }
} 