| Field | Type |
|-------|------|
| - |
| Workflow | |
| workflow.inputs | WorkflowVariable[] where WorkflowVariable extends Variable with io_type: 'input' |
| workflow.outputs | WorkflowVariable[] where WorkflowVariable extends Variable with io_type: 'output' |
| workflow.steps.parameter_mappings | Record<ToolParameterName, WorkflowVariableName> |
| workflow.steps.output_mappings | Record<ToolOutputName, WorkflowVariableName> |
| workflow.steps.evaluation_config.conditions.variable | WorkflowVariableName (branded string type) |
| workflow.steps.evaluation_config.conditions.value | any |
| - |
| Job | |
| job.input_variables | JobVariable[] where JobVariable extends Variable with required: boolean |
| job.output_data | Record<WorkflowVariableName, SchemaValueType> |
| job.steps.parameter_mappings | Record<ToolParameterName, WorkflowVariableName> |
| job.steps.output_mappings | Record<ToolOutputName, WorkflowVariableName> |
| job.steps.evaluation_config.conditions.variable | WorkflowVariableName (branded string type) |
| job.steps.evaluation_config.conditions.value | any |
| job.steps.output_data | Record<string, SchemaValueType> |
| - |
| JobContext | |
| jobcontext.inputValues | Record<string, any> |
| jobcontext.executionState.variables | Record<WorkflowVariableName, SchemaValueType> |
| jobcontext.executionState.step_results.outputs | Record<WorkflowVariableName, SchemaValueType> |


```
workflow.ts
// Execution result for runtime steps
export interface StepExecutionResult {
    success: boolean;
    error?: string;
    outputs?: Record<WorkflowVariableName, SchemaValueType>;
}

jobs.ts extens workflow's StepExecutionResult which it imports as WorkflowStepResult
// Step execution result (aligned with workflow step result)
export interface StepExecutionResult extends WorkflowStepResult {
    step_id: JobStepId;
    started_at: string;
    completed_at?: string;
}

// Evaluation result that determines the next step in workflow
export interface EvaluationResult extends StepExecutionResult {
    next_action: 'continue' | 'jump' | 'end';
    target_step_index?: number;  // Only required when next_action is 'jump'
    reason?: string;  // Optional explanation for the decision
}



// Evaluation result that determines the next step in workflow
export interface EvaluationResult extends StepExecutionResult {
    next_action: 'continue' | 'jump' | 'end';
    target_step_index?: number;  // Only required when next_action is 'jump'
    reason?: string;  // Optional explanation for the decision
}
```
