I'll create a comprehensive table of all the variable rendering locations in your codebase. Let me first search for all the relevant components and their rendering code.

Search files...
Let me search for more information about the ActionStepRunner and DataflowMapper2 components:

Search files...
Let me search for information about DataflowMapper2 and IO Config:

Search files...
Let me search for information about IO Config:

Search files...
Let me search for JobDetail component:

Search files...
Based on all the information I've gathered, I can now create a comprehensive table of all the variable rendering locations in your codebase:

# Variable Rendering Components Table

| Component | Location | Rendering Component Used | Implementation Details |
|-----------|----------|--------------------------|------------------------|
| **Workflow Components** |
| IO Config | `WorkflowIOEditor` in `WorkflowConfig.tsx` | `VariableEditor` | Uses a custom `VariableEditor` component that renders workflow input/output variables with schema information. Allows editing variable properties. |
| ActionStepEditor | Via `DataflowMapper2` in `DataFlowMapper2.tsx` | `renderVariablePaths` | Uses utility functions from `variableUIUtils.tsx` to render variable paths with properties for selection. Displays type information with color coding. |
| ActionStepRunner | `ActionStepRunner.tsx` | `VariableRenderer` | Uses the standard `VariableRenderer` for most values and custom `renderFileValue` for file types. Has special handling for editable values via `renderEditableValue`. |
| **Job Components** |
| JobSummary | `JobSummary.tsx` | `VariableRenderer` and `EnhancedMarkdownRenderer` | Uses `EnhancedMarkdownRenderer` for string output variables and `VariableRenderer` for other types. Sets `isMarkdown={true}` for output variables. |
| JobDetail | `JobStepDetails.tsx` | `VariableRenderer` | Uses `VariableRenderer` for both input parameters and outputs. For outputs, sets `isMarkdown={true}` to render markdown content. |
| JobExecutionHistory | `JobExecutionHistory.tsx` | `SimpleVariableRenderer` and `VariableRenderer` | Uses a custom `SimpleVariableRenderer` for primitive values and falls back to `VariableRenderer` for complex types like arrays and objects. |

## Additional Details:

1. **VariableRenderer** (`frontend/src/components/common/VariableRenderer.tsx`):
   - The primary component used across the application for rendering variables
   - Handles different data types: arrays, objects, text (including markdown), and primitive values
   - Has special handling for file objects
   - Supports truncation of long text and arrays

2. **EnhancedMarkdownRenderer** (`frontend/src/components/common/EnhancedMarkdownRenderer.tsx`):
   - Used specifically for rendering markdown content with additional features
   - Used in JobSummary for string output variables

3. **SimpleVariableRenderer** (`frontend/src/components/job/JobExecutionHistory.tsx`):
   - A simplified version of VariableRenderer that doesn't show type information
   - Used for primitive values in JobExecutionHistory
   - Falls back to standard VariableRenderer for complex types

4. **DataFlowMapper2** (`frontend/src/components/DataFlowMapper2.tsx`):
   - Uses utility functions from `variableUIUtils.tsx` to render variable paths
   - Displays type information with color coding
   - Used in ActionStepEditor for mapping variables to tool parameters and outputs

This table provides a comprehensive overview of all the variable rendering components used throughout your application, including their locations and implementation details.
