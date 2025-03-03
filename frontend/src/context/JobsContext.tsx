import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatus, JobExecutionState, CreateJobRequest, StepExecutionResult, JobId, JobStepId, JobStep } from '../types/jobs';
import { WorkflowVariable, WorkflowVariableName, WorkflowStepType, Workflow, WorkflowStatus, WorkflowStep, WorkflowStepId, getWorkflowInputs, EvaluationResult, StepExecutionResult as WorkflowStepResult } from '../types/workflows';
import { SchemaValueType, ValueType, Schema } from '../types/schema';
import { useWorkflows } from './WorkflowContext';
import { WorkflowEngine } from '../lib/workflow/workflowEngine';

interface JobError {
    message: string;
    code?: string;
    details?: string;
}

interface JobsContextState {
    jobs: Job[];
    currentJob?: Job;
    executionState?: JobExecutionState;
    isLoading: boolean;
    error?: JobError;
    inputValues: Record<string, any>;
    inputErrors: Record<string, string>;
}

interface JobsContextValue extends JobsContextState {
    // Job Management
    loadJobs: () => Promise<void>;
    loadJob: (jobId: string) => Promise<void>;
    getJob: (jobId: string) => Promise<Job>;
    createJob: (request: CreateJobRequest) => Promise<Job>;
    deleteJob: (jobId: string) => Promise<void>;

    // Job Execution
    runJob: () => Promise<void>;
    cancelJob: (jobId: string) => Promise<void>;
    resetJob: (jobId: string) => Promise<void>;

    // Input Management
    setInputValue: (variableId: string, value: any) => void;
    validateInputs: () => boolean;
    clearInputs: () => void;
    areInputsValid: () => boolean;

    // State Management
    setCurrentJob: (job?: Job) => void;
    resetCurrentJob: () => void;
    clearError: () => void;
}

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

// Helper function to convert Job to Workflow format
const jobToWorkflow = (job: Job, inputs: WorkflowVariable[], outputs: WorkflowVariable[]): Workflow => {
    // Convert JobStepId to WorkflowStepId (they're branded types)
    const convertedSteps = job.steps.map(step => {
        // Only include properties that exist in WorkflowStep
        const workflowStep: WorkflowStep = {
            step_id: `${step.step_id}` as WorkflowStepId,
            workflow_id: job.workflow_id,
            label: step.label,
            description: step.description,
            step_type: step.step_type,
            sequence_number: step.sequence_number,
            parameter_mappings: step.parameter_mappings || {},
            output_mappings: step.output_mappings || {},
            tool: step.tool,
            tool_id: step.tool_id,
            prompt_template_id: step.prompt_template_id,
            evaluation_config: step.evaluation_config,
            created_at: step.started_at || new Date().toISOString(),
            updated_at: step.completed_at || new Date().toISOString()
        };
        return workflowStep;
    });

    // Combine inputs and outputs into a single state array
    // Convert any 'evaluation' io_type to 'output' to avoid API validation errors
    const state = [...inputs, ...outputs].map(variable => {
        if (variable.io_type === 'evaluation') {
            return {
                ...variable,
                io_type: 'output' as const
            };
        }
        return variable;
    });

    // Only include properties that exist in Workflow
    return {
        workflow_id: job.workflow_id,
        name: job.name,
        description: job.description,
        status: WorkflowStatus.DRAFT,
        steps: convertedSteps,
        state: state
    };
};

// Helper function to build a workflow from a job and its inputs/outputs
const getStepWorkflowFromJob = (
    job: Job,
    preparedInputVariables: {
        name: WorkflowVariableName;
        variable_id: string;
        value?: any;
        schema: Schema;
        description?: string;
        required?: boolean;
    }[],
    jobOutputs: Record<WorkflowVariableName, SchemaValueType>
): Workflow => {
    // Convert input variables to workflow variables with proper io_type
    const workflowInputs = preparedInputVariables.map(v => ({
        ...v,
        io_type: 'input' as const
    }));

    // Convert output records to workflow variables
    const workflowOutputs = Object.entries(jobOutputs).map(([name, value]) => {
        // Determine the appropriate io_type based on the variable name
        let ioType: 'input' | 'output' | 'evaluation' = 'output';

        // If it's an evaluation result or jump counter, mark it as evaluation
        if (name.startsWith('eval_') || name.startsWith('jump_count_')) {
            ioType = 'evaluation';
        }

        return {
            name: name as WorkflowVariableName,
            variable_id: name,
            value,
            io_type: ioType,
            schema: {
                type: typeof value as ValueType,
                is_array: Array.isArray(value)
            }
        };
    });

    // Extract evaluation-specific outputs from job steps
    const evaluationOutputs: WorkflowVariable[] = [];

    // Process each step to find evaluation outputs and jump counters
    job.steps.forEach(step => {
        if (step.step_type === WorkflowStepType.EVALUATION && step.output_data) {
            // Create evaluation result variable
            const shortStepId = step.step_id.slice(0, 8);
            const evalVarName = `eval_${shortStepId}` as WorkflowVariableName;

            // Only add if not already in jobOutputs
            if (!(evalVarName in jobOutputs)) {
                evaluationOutputs.push({
                    name: evalVarName,
                    variable_id: evalVarName,
                    value: step.output_data,
                    io_type: 'evaluation' as const,
                    schema: { type: 'object' as ValueType, is_array: false }
                });
            }

            // Check if there's jump counter info in the output data
            const jumpInfo = (step.output_data as any)?._jump_info;
            if (jumpInfo) {
                const jumpCounterName = `jump_count_${shortStepId}` as WorkflowVariableName;

                // Only add if not already in jobOutputs
                if (!(jumpCounterName in jobOutputs)) {
                    evaluationOutputs.push({
                        name: jumpCounterName,
                        variable_id: jumpCounterName,
                        value: jumpInfo.jump_count || 0,
                        io_type: 'evaluation' as const,
                        schema: { type: 'number' as ValueType, is_array: false }
                    });
                }
            }
        }
    });

    // Create and return workflow representation with all variables
    return jobToWorkflow(job, workflowInputs, [...workflowOutputs, ...evaluationOutputs]);
};

// Helper function to convert workflow step to job step
const workflowStepToJobStep = (step: WorkflowStep, jobId: JobId): JobStep => {
    // Convert WorkflowStepId to JobStepId (they're branded types)
    const jobStepId = step.step_id.replace('workflow-', '') as JobStepId;

    return {
        step_id: jobStepId,
        job_id: jobId,
        label: step.label,
        description: step.description,
        step_type: step.step_type,
        sequence_number: step.sequence_number,
        parameter_mappings: step.parameter_mappings,
        output_mappings: step.output_mappings,
        tool: step.tool,
        tool_id: step.tool_id,
        prompt_template_id: step.prompt_template_id,
        evaluation_config: step.evaluation_config,
        status: JobStatus.RUNNING,
        error_message: undefined,
        output_data: undefined,
        started_at: undefined,
        completed_at: undefined
    };
};

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [state, setState] = useState<JobsContextState>({
        jobs: [],
        isLoading: false,
        inputValues: {},
        inputErrors: {},
    });

    const { workflows } = useWorkflows();

    // Persist current job in sessionStorage
    useEffect(() => {
        if (state.currentJob) {
            sessionStorage.setItem('currentJob', JSON.stringify(state.currentJob));
        }
    }, [state.currentJob]);

    // Restore current job from sessionStorage
    useEffect(() => {
        const savedJob = sessionStorage.getItem('currentJob');
        if (savedJob) {
            setState(prev => ({
                ...prev,
                currentJob: JSON.parse(savedJob)
            }));
        }
    }, []);

    // Clear session storage when resetting current job
    const resetCurrentJob = useCallback(() => {
        setState(prev => ({ ...prev, currentJob: undefined }));
        sessionStorage.removeItem('currentJob');
    }, []);

    // Job list management
    const loadJobs = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Just return the jobs from state
            setState(prev => ({ ...prev, isLoading: false }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: {
                    message: error instanceof Error ? error.message : 'Failed to load jobs',
                    code: 'JOBS_LOAD_ERROR'
                }
            }));
        }
    }, []);

    const loadJob = useCallback(async (jobId: string): Promise<void> => {
        //console.log('loadJob', jobId);
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            //console.log('loadJob', jobId, state.jobs);
            const job = state.jobs.find(j => j.job_id === jobId);
            if (!job) {
                const error: JobError = {
                    message: 'Job not found',
                    code: 'JOB_NOT_FOUND',
                    details: `Could not find job with ID: ${jobId}`
                };
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error,
                    currentJob: undefined
                }));
                // Redirect to jobs manager after a short delay to show the error
                console.log('loadJob error', error);
                //throw new Error(error.message);
            }
            //console.log('loadJob found job', job);
            setState(prev => ({ ...prev, currentJob: job, isLoading: false }));
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to load job',
                code: 'JOB_LOAD_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError,
                currentJob: undefined
            }));
            console.log('loadJob error cought', jobError);
            //throw error;
        }
    }, [navigate, state.jobs]);

    const getJob = useCallback(async (jobId: string): Promise<Job> => {
        const job = state.jobs.find(j => j.job_id === jobId);
        if (!job) {
            const error: JobError = {
                message: 'Job not found',
                code: 'JOB_NOT_FOUND',
                details: `Could not find job with ID: ${jobId}`
            };
            setState(prev => ({
                ...prev,
                error
            }));
            throw new Error(error.message);
        }
        return job;
    }, [state.jobs]);

    const createJob = useCallback(async (request: CreateJobRequest): Promise<Job> => {
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));
        try {
            // Create a new job with initial state
            const workflow = workflows?.find(w => w.workflow_id === request.workflow_id);
            if (!workflow) {
                const error: JobError = {
                    message: 'Workflow not found',
                    code: 'WORKFLOW_NOT_FOUND',
                    details: `Could not find workflow with ID: ${request.workflow_id}`
                };
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error
                }));
                throw new Error(error.message);
            }

            const jobId = `job-${Date.now()}` as JobId;
            const jobSteps: JobStep[] = workflow.steps.map((step, index) => ({
                step_id: `${jobId}_step_${index}` as JobStepId,
                job_id: jobId as JobId,
                label: step.label,
                description: step.description,
                step_type: step.step_type,
                sequence_number: index,
                status: JobStatus.PENDING,
                tool: step.tool,
                tool_id: step.tool_id,
                prompt_template_id: step.prompt_template_id,
                parameter_mappings: step.parameter_mappings,
                output_mappings: step.output_mappings,
                evaluation_config: step.evaluation_config
            }));

            // Use getWorkflowInputs helper to get inputs from workflow state
            const workflowInputs = getWorkflowInputs(workflow);

            const newJob: Job = {
                job_id: jobId,
                workflow_id: request.workflow_id,
                name: request.name,
                description: request.description || '',
                status: JobStatus.PENDING,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: 'default',
                input_variables: workflowInputs.map((i) => ({
                    ...i,
                    required: i.required || true,
                })) || [],
                steps: jobSteps
            };

            console.log('createJob will add new job:', newJob);
            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, newJob],
                currentJob: newJob,
                isLoading: false
            }));

            return newJob;
        } catch (error) {
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to create job',
                code: 'JOB_CREATE_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError
            }));
            throw error;
        }
    }, [workflows]);

    const deleteJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.filter(j => j.job_id !== jobId),
            currentJob: prev.currentJob?.job_id === jobId ? undefined : prev.currentJob
        }));
    }, []);

    const runJob = useCallback(async (): Promise<void> => {
        // Set initial loading state
        setState(prev => ({ ...prev, isLoading: true, error: undefined }));

        try {
            // 1. Validate and get current job (fail fast if no job)
            const job = state.currentJob;
            if (!job) {
                throw new Error('No job selected');
            }

            // 2. Prepare all inputs and initial state
            const preparedInputVariables = job.input_variables.map(variable => ({
                ...variable,
                value: state.inputValues[variable.variable_id]
            }));

            // Create a local copy of the job to track execution state
            const initialJob = {
                ...job,
                status: JobStatus.RUNNING,
                started_at: new Date().toISOString(),
                input_variables: preparedInputVariables,
                execution_progress: {
                    current_step: 0,
                    total_steps: job.steps.length
                },
                steps: job.steps.map(step => ({
                    ...step,
                    status: step.sequence_number === 0 ? JobStatus.RUNNING : JobStatus.PENDING,
                    started_at: step.sequence_number === 0 ? new Date().toISOString() : undefined,
                    output_data: step.status === JobStatus.COMPLETED ? step.output_data : undefined
                })) as JobStep[]
            };

            // Initialize tracking variables
            const initialJobOutputs: Record<WorkflowVariableName, SchemaValueType> = {};
            const initialStepResults: StepExecutionResult[] = [];

            // 3. Update UI with initial job state
            const initialExecutionState: JobExecutionState = {
                job_id: job.job_id as JobId,
                current_step_index: 0,
                total_steps: job.steps.length,
                is_paused: false,
                live_output: 'Initializing job execution...',
                status: JobStatus.RUNNING,
                step_results: [],
                variables: {}
            };

            // Update UI with initial job state
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === job.job_id ? initialJob : j),
                currentJob: initialJob,
                executionState: initialExecutionState,
                inputValues: {}, // Reset input values
                inputErrors: {}, // Reset input errors
                isLoading: false
            }));

            // Helper function to update UI with current step progress
            const updateStepProgress = (message: string) => {
                setState(prev => ({
                    ...prev,
                    executionState: {
                        ...prev.executionState!,
                        live_output: message
                    }
                }));
            };

            /**
             * Executes job steps recursively, handling state management and step transitions.
             * 
             * MAPPING DOCUMENTATION:
             * 
             * 1. From executeStepSimple, we get two key pieces of information:
             *    - updatedState: The updated workflow variables after step execution
             *    - stepResult: The execution result of the specific step that drove the update of the workflow state
             * 
             * 2. These are mapped as follows:
             *    
             *    a) updatedState is used to:
             *       - Update the job outputs (updatedOutputs) by extracting all variable values
             *       - Find evaluation results for conditional logic (evalVar)
             *       - Create a workflow representation for getNextStepIndex (workflowForNextStep)
             *    
             *    b) stepResult is used to:
             *       - Create a step execution record (stepExecutionResult)
             *       - Update the job step status (completed/failed)
             *       - Extract outputs for evaluation steps
             * 
             * 3. For evaluation steps, additional mappings occur:
             *    - evalResult from updatedState determines the next step (jump logic)
             *    - Jump information is added to the step's output_data
             * 
             * 4. getNextStepIndex returns:
             *    - nextStepIndex: The index of the next step to execute
             *    - updatedState: Any state changes from jump counter updates
             *    These are merged back into updatedOutputs
             */
            const executeJobSteps = async (
                currentJob: Job,
                currentStepIndex: number,
                jobOutputs: Record<WorkflowVariableName, SchemaValueType>,
                stepResults: StepExecutionResult[]
            ): Promise<{
                finalJob: Job,
                finalStepResults: StepExecutionResult[],
                finalOutputs: Record<WorkflowVariableName, SchemaValueType>,
                isCompleted: boolean
            }> => {
                console.log('executeJobSteps', currentStepIndex, jobOutputs, stepResults);

                // Check if we've reached the end of the workflow
                if (currentStepIndex >= currentJob.steps.length) {
                    return {
                        finalJob: currentJob,
                        finalStepResults: stepResults,
                        finalOutputs: jobOutputs,
                        isCompleted: true
                    };
                }

                try {
                    // STEP 1: Prepare the current step for execution
                    // ------------------------------------------------
                    const updatedJob = prepareJobStepForExecution(currentJob, currentStepIndex);
                    updateStepProgress(`Starting step ${currentStepIndex + 1} of ${updatedJob.steps.length}: ${updatedJob.steps[currentStepIndex]?.label || 'Unknown step'}...`);

                    // STEP 2: Execute the step
                    // ------------------------------------------------
                    // Create workflow representation for this step
                    const stepWorkflow = getStepWorkflowFromJob(updatedJob, preparedInputVariables, jobOutputs);

                    // Execute the step and get results
                    const { updatedState, result: stepResult } = await WorkflowEngine.executeStepSimple(
                        stepWorkflow,
                        currentStepIndex
                    );

                    console.log('Step execution results:', { stepResult, updatedState });

                    // STEP 3: Process execution results
                    // ------------------------------------------------
                    // Create step execution record
                    const stepExecutionResult = createStepExecutionRecord(
                        stepResult,
                        updatedJob.steps[currentStepIndex]
                    );

                    // Update job with completed step
                    const jobWithCompletedStep = updateJobWithStepResult(
                        updatedJob,
                        currentStepIndex,
                        stepResult
                    );

                    // STEP 4: Update outputs with state changes
                    // ------------------------------------------------
                    // Merge all state variables into outputs
                    const updatedOutputs = mergeStateIntoOutputs(jobOutputs, updatedState);

                    // STEP 5: Determine next step (handle evaluation logic)
                    // ------------------------------------------------
                    // For evaluation steps, check if we need to jump
                    const { nextStepIndex, jobWithProcessedEval } = processEvaluationStep(
                        jobWithCompletedStep,
                        currentStepIndex,
                        updatedState,
                        stepResult
                    );

                    // STEP 6: Update state with jump counters if needed
                    // ------------------------------------------------
                    // Get next step from WorkflowEngine (handles jump counters)
                    const { nextStepIndex: confirmedNextStepIndex, updatedState: nextStepState } = WorkflowEngine.getNextStepIndex(
                        createWorkflowFromJob(jobWithProcessedEval, updatedState),
                        currentStepIndex
                    );

                    // Merge any additional state changes from getNextStepIndex
                    const finalOutputs = mergeStateIntoOutputs(updatedOutputs, nextStepState);

                    // STEP 7: Prepare for next step
                    // ------------------------------------------------
                    // Update UI before moving to next step
                    if (confirmedNextStepIndex < jobWithProcessedEval.steps.length) {
                        const nextStep = jobWithProcessedEval.steps[confirmedNextStepIndex];
                        updateStepProgress(`Moving to step ${confirmedNextStepIndex + 1}: ${nextStep?.label || 'Unknown step'}...`);
                    }

                    // Continue with next step (recursive call)
                    return executeJobSteps(
                        jobWithProcessedEval,
                        confirmedNextStepIndex,
                        finalOutputs,
                        [...stepResults, stepExecutionResult]
                    );
                } catch (error) {
                    // Handle step error
                    const errorMessage = error instanceof Error ? error.message : `Error executing step ${currentStepIndex}`;
                    const failedJob = createFailedJob(currentJob, currentStepIndex, errorMessage);
                    updateStepProgress(`Error in step ${currentStepIndex + 1}: ${errorMessage}`);

                    return {
                        finalJob: failedJob,
                        finalStepResults: stepResults,
                        finalOutputs: jobOutputs,
                        isCompleted: false
                    };
                }
            };

            /**
             * Prepares a job step for execution by updating its status
             */
            const prepareJobStepForExecution = (job: Job, stepIndex: number): Job => {
                return {
                    ...job,
                    execution_progress: {
                        current_step: stepIndex,
                        total_steps: job.steps.length
                    },
                    steps: job.steps.map((step, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...step,
                                status: JobStatus.RUNNING,
                                started_at: new Date().toISOString()
                            };
                        } else if (idx < stepIndex) {
                            return {
                                ...step,
                                status: JobStatus.COMPLETED
                            };
                        }
                        return step;
                    }) as JobStep[]
                };
            };

            /**
             * Creates a step execution record from step result
             */
            const createStepExecutionRecord = (
                stepResult: WorkflowStepResult,
                step: JobStep
            ): StepExecutionResult => {
                return {
                    ...stepResult,
                    step_id: step.step_id,
                    started_at: step.started_at || new Date().toISOString(),
                    completed_at: new Date().toISOString()
                };
            };

            /**
             * Updates job with step execution result
             */
            const updateJobWithStepResult = (
                job: Job,
                stepIndex: number,
                stepResult: WorkflowStepResult
            ): Job => {
                return {
                    ...job,
                    steps: job.steps.map((step, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...step,
                                status: stepResult.success ? JobStatus.COMPLETED : JobStatus.FAILED,
                                completed_at: new Date().toISOString(),
                                result: stepResult
                            };
                        }
                        return step;
                    }) as JobStep[]
                };
            };

            /**
             * Merges workflow state variables into job outputs
             */
            const mergeStateIntoOutputs = (
                outputs: Record<WorkflowVariableName, SchemaValueType>,
                state: WorkflowVariable[]
            ): Record<WorkflowVariableName, SchemaValueType> => {
                const updatedOutputs = { ...outputs };

                if (state) {
                    state.forEach(variable => {
                        if (variable.value !== undefined && variable.name) {
                            updatedOutputs[variable.name as WorkflowVariableName] = variable.value as SchemaValueType;
                        }
                    });
                }

                return updatedOutputs;
            };

            /**
             * Processes evaluation step and determines next step
             */
            const processEvaluationStep = (
                job: Job,
                stepIndex: number,
                state: WorkflowVariable[],
                stepResult: WorkflowStepResult
            ): { nextStepIndex: number, jobWithProcessedEval: Job } => {
                // Default to next step
                let nextStepIndex = stepIndex + 1;
                let jobWithProcessedEval = job;

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

                    // Update evaluation step with jump info
                    const isJump = nextStepIndex !== stepIndex + 1 && nextStepIndex < job.steps.length;
                    const evalOutput = stepResult.outputs || {};
                    const reason = evalOutput['reason' as WorkflowVariableName] || 'No reason provided';

                    jobWithProcessedEval = {
                        ...job,
                        steps: job.steps.map((s, idx) => {
                            if (idx === stepIndex) {
                                const updatedOutputData = {
                                    ...evalOutput,
                                };

                                // Add _jump_info using type assertion
                                (updatedOutputData as any)._jump_info = {
                                    is_jump: isJump,
                                    from_step: stepIndex,
                                    to_step: nextStepIndex,
                                    reason: reason
                                };

                                return {
                                    ...s,
                                    output_data: updatedOutputData
                                };
                            }
                            return s;
                        }) as JobStep[]
                    };

                    // Update UI with jump information
                    const jumpMessage = isJump
                        ? `Evaluation step ${stepIndex + 1} resulted in a jump to step ${nextStepIndex + 1}. Reason: ${reason}`
                        : `Evaluation step ${stepIndex + 1} completed. Continuing to next step. Reason: ${reason}`;
                    updateStepProgress(jumpMessage);
                }

                return { nextStepIndex, jobWithProcessedEval };
            };

            /**
             * Creates a workflow representation from a job
             */
            const createWorkflowFromJob = (job: Job, state: WorkflowVariable[]): Workflow => {
                return {
                    workflow_id: job.workflow_id,
                    name: job.name,
                    description: job.description,
                    status: WorkflowStatus.PUBLISHED,
                    steps: job.steps.map((step, index) => ({
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
                    })) as unknown as WorkflowStep[],
                    state: state
                };
            };

            /**
             * Creates a failed job with error information
             */
            const createFailedJob = (job: Job, stepIndex: number, errorMessage: string): Job => {
                return {
                    ...job,
                    status: JobStatus.FAILED,
                    error_message: errorMessage,
                    steps: job.steps.map((s, idx) => {
                        if (idx === stepIndex) {
                            return {
                                ...s,
                                status: JobStatus.FAILED,
                                error_message: errorMessage,
                                completed_at: new Date().toISOString()
                            };
                        }
                        return s;
                    }) as JobStep[]
                };
            };

            // Start the recursive execution
            const { finalJob, finalStepResults, finalOutputs, isCompleted } = await executeJobSteps(
                initialJob,
                0,
                initialJobOutputs,
                initialStepResults
            );

            // 5. Finalize job
            // Get the final step's output data if available
            const finalStep = isCompleted && finalJob.steps.length > 0
                ? finalJob.steps[finalJob.steps.length - 1]
                : null;

            // Use final step's output_data if available, otherwise use accumulated jobOutputs
            const finalOutputData = finalStep?.output_data || finalOutputs;

            const completedJob = {
                ...finalJob,
                status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED,
                completed_at: new Date().toISOString(),
                output_data: finalOutputData,
                execution_progress: {
                    current_step: isCompleted ? finalJob.steps.length : finalJob.execution_progress?.current_step || 0,
                    total_steps: finalJob.steps.length
                }
            };

            // Format final output summary
            let outputSummary = 'No outputs';
            if (finalOutputData && Object.keys(finalOutputData).length > 0) {
                try {
                    outputSummary = Object.entries(finalOutputData)
                        .map(([key, value]) => {
                            const displayValue = typeof value === 'object'
                                ? JSON.stringify(value, null, 2).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
                                : String(value);
                            return `${key}: ${displayValue}`;
                        })
                        .join('\n');
                } catch (error) {
                    console.error('Error formatting final step outputs:', error);
                    outputSummary = 'Error formatting final step outputs';
                }
            }

            // Generate execution path summary
            let executionPathSummary = '';
            try {
                // Get jumps from evaluation steps
                const jumps = finalJob.steps
                    .filter(step => {
                        if (step.step_type !== WorkflowStepType.EVALUATION || !step.output_data) return false;
                        const jumpInfo = (step.output_data as any)._jump_info;
                        return jumpInfo && jumpInfo.is_jump;
                    })
                    .map(step => {
                        const jumpInfo = (step.output_data as any)._jump_info;
                        return {
                            from: jumpInfo.from_step,
                            to: jumpInfo.to_step,
                            reason: jumpInfo.reason
                        };
                    });

                // Get completed steps in execution order
                const completedSteps = finalJob.steps.filter(step =>
                    step.status === JobStatus.COMPLETED && step.started_at
                ).sort((a, b) =>
                    new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime()
                );

                if (completedSteps.length > 0) {
                    executionPathSummary = '\n\nExecution path:\n' +
                        completedSteps.map((step, index) =>
                            `${index + 1}. Step ${step.sequence_number + 1}: ${step.label}`
                        ).join('\n');

                    // Add jump information if there were any jumps
                    if (jumps.length > 0) {
                        executionPathSummary += '\n\nJumps that occurred:\n' +
                            jumps.map(jump =>
                                `- Jump from step ${jump.from + 1} to step ${jump.to + 1}. Reason: ${jump.reason}`
                            ).join('\n');
                    }
                }
            } catch (error) {
                console.error('Error generating execution path summary:', error);
            }

            const finalMessage = isCompleted
                ? `Job completed successfully.\n\nFinal step outputs:\n${outputSummary}${executionPathSummary}`
                : 'Job failed to complete. See error details above.';

            // 6. Final state update with complete job results
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === job.job_id ? completedJob : j),
                currentJob: completedJob,
                executionState: {
                    ...prev.executionState!,
                    current_step_index: isCompleted ? completedJob.steps.length : completedJob.execution_progress?.current_step || 0,
                    live_output: finalMessage,
                    status: isCompleted ? JobStatus.COMPLETED : JobStatus.FAILED,
                    step_results: finalStepResults
                },
                isLoading: false
            }));

        } catch (error) {
            // Handle overall job error
            const jobError: JobError = {
                message: error instanceof Error ? error.message : 'Failed to run job',
                code: 'JOB_RUN_ERROR',
                details: error instanceof Error ? error.stack : undefined
            };

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: jobError,
                executionState: prev.executionState ? {
                    ...prev.executionState,
                    status: JobStatus.FAILED,
                    live_output: `Job execution failed: ${jobError.message}`
                } : undefined
            }));

            throw error;
        }
    }, [state.currentJob, state.jobs, state.inputValues]);

    const cancelJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => {
            const job = prev.jobs.find(j => j.job_id === jobId);
            if (!job) return prev;

            const cancelledJob = {
                ...job,
                status: JobStatus.FAILED,
                error_message: 'Job cancelled by user',
                completed_at: new Date().toISOString()
            };

            return {
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? cancelledJob : j),
                currentJob: prev.currentJob?.job_id === jobId ? cancelledJob : prev.currentJob,
                error: {
                    message: 'Job cancelled by user',
                    code: 'JOB_CANCELLED'
                }
            };
        });
    }, []);

    const resetJob = useCallback(async (jobId: string): Promise<void> => {
        setState(prev => {
            const job = prev.jobs.find(j => j.job_id === jobId);
            if (!job) return prev;

            const resetJob = {
                ...job,
                status: JobStatus.PENDING,
                error_message: undefined,
                started_at: undefined,
                completed_at: undefined,
                steps: job.steps.map(step => ({
                    ...step,
                    status: JobStatus.PENDING,
                    output_data: undefined,
                    error_message: undefined,
                    started_at: undefined,
                    completed_at: undefined
                }))
            };

            return {
                ...prev,
                jobs: prev.jobs.map(j => j.job_id === jobId ? resetJob : j),
                currentJob: prev.currentJob?.job_id === jobId ? resetJob : prev.currentJob,
                inputValues: {},
                inputErrors: {}
            };
        });
    }, []);

    // Input Management
    const setInputValue = useCallback((variableId: string, value: any) => {
        setState(prev => {
            const newInputValues = {
                ...prev.inputValues,
                [variableId]: value
            };

            // Clear error when value is set
            const newInputErrors = { ...prev.inputErrors };
            delete newInputErrors[variableId];

            // Validate in real-time if needed
            if (!value || value === '') {
                newInputErrors[variableId] = 'This field is required';
            }

            return {
                ...prev,
                inputValues: newInputValues,
                inputErrors: newInputErrors
            };
        });
    }, []);

    const validateInputs = useCallback(() => {
        if (!state.currentJob?.workflow_id) return false;

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob?.workflow_id);
        if (!workflow) return false;

        // Use getWorkflowInputs helper to get inputs from workflow state
        const workflowInputs = getWorkflowInputs(workflow);

        const newErrors: Record<string, string> = {};
        let isValid = true;

        workflowInputs.forEach((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (input.schema.type === 'boolean') return;
            if (input.schema.type === 'file') {
                if (!value?.file_id) {
                    newErrors[input.variable_id] = 'Please select a file';
                    isValid = false;
                }
                return;
            }
            if (!value) {
                newErrors[input.variable_id] = 'This field is required';
                isValid = false;
            }
        });

        setState(prev => ({
            ...prev,
            inputErrors: newErrors
        }));

        return isValid;
    }, [state.currentJob, state.inputValues, workflows]);

    const clearInputs = useCallback(() => {
        setState(prev => ({
            ...prev,
            inputValues: {},
            inputErrors: {}
        }));
    }, []);

    const areInputsValid = useCallback(() => {
        if (!state.currentJob?.workflow_id) return false;

        const workflow = workflows?.find(w => w.workflow_id === state.currentJob?.workflow_id);
        if (!workflow) return false;

        // Use getWorkflowInputs helper to get inputs from workflow state
        const workflowInputs = getWorkflowInputs(workflow);

        return workflowInputs.every((input: WorkflowVariable) => {
            const value = state.inputValues[input.variable_id];
            if (input.schema.type === 'boolean') return true;
            if (input.schema.type === 'file') return !!value?.file_id;
            return value !== undefined && value !== '';
        });
    }, [state.currentJob, state.inputValues, workflows]);

    // State management helpers
    const setCurrentJob = useCallback((job?: Job) => {
        setState(prev => ({ ...prev, currentJob: job }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: undefined }));
    }, []);

    const value: JobsContextValue = {
        ...state,
        loadJobs,
        loadJob,
        getJob,
        createJob,
        deleteJob,
        runJob,
        cancelJob,
        resetJob,
        setInputValue,
        validateInputs,
        clearInputs,
        areInputsValid,
        setCurrentJob,
        resetCurrentJob,
        clearError,
    };

    return (
        <JobsContext.Provider value={value}>
            {children}
        </JobsContext.Provider>
    );
};

export const useJobs = () => {
    const context = useContext(JobsContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobsProvider');
    }
    return context;
}; 