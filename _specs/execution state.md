| Location | Field | Type | Description |
|----------|-------|------|-------------|
| - |
| Job | | | |
| job.status | JobStatus | 'pending' \| 'running' \| 'completed' \| 'failed' | Overall job status |
| job.execution_progress | Object | { current_step: number; total_steps: number; is_paused?: boolean } | Persistent progress tracking |
| job.live_output | string | String | Current execution output message |
| job.output_data | Object | Record<WorkflowVariableName, SchemaValueType> | Accumulated job outputs |
| Job Step | | | |
| job.steps[].status | JobStatus | 'pending' \| 'running' \| 'completed' \| 'failed' | Individual step status |
| job.steps[].output_data | Object | Record<string, SchemaValueType> | Step execution outputs |
| - |
| JobContext | | | |
| jobcontext.executionState.status | JobStatus | 'pending' \| 'running' \| 'completed' \| 'failed' | Live execution status |
| jobcontext.executionState.current_step_index | number | Number | Current executing step |
| jobcontext.executionState.total_steps | number | Number | Total steps in job |
| jobcontext.executionState.is_paused | boolean | Boolean | Whether execution is paused |
| jobcontext.executionState.live_output | string | String | Live execution output message |
| jobcontext.executionState.variables | Object | Record<WorkflowVariableName, SchemaValueType> | Runtime variable values |
| jobcontext.executionState.step_results | Array | StepExecutionResult[] | Results of executed steps |
| - |
| Step Execution Result | | | |
| step_results[].success | boolean | Boolean | Whether step succeeded |
| step_results[].error | string? | String | Error message if failed |
| step_results[].outputs | Object | Record<WorkflowVariableName, SchemaValueType> | Step outputs |
| step_results[].started_at | string | ISO Date String | When step started |
| step_results[].completed_at | string? | ISO Date String | When step completed |
| - |
| Workflow | | | |
| workflow.status | WorkflowStatus | 'DRAFT' \| 'PUBLISHED' \| 'ARCHIVED' | Workflow lifecycle status |

Additional Notes:
- All timestamps are stored as ISO date strings
- SchemaValueType can be: string | number | boolean | SchemaObjectType | FileValue
- Status transitions generally follow: PENDING -> RUNNING -> (COMPLETED | FAILED)
- Both job.execution_progress and jobcontext.executionState track progress, but the context version is for live updates while the job version is for persistence
- The JobContext executionState provides real-time execution tracking while Job fields provide persistent storage
- Step results are accumulated in jobcontext.executionState.step_results during execution


