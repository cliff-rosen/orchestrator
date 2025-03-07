# Variable Path Mapping in Workflow System

## Core Structures

1. **Variable Paths**: Dot-notation strings (e.g., `variable.property.subproperty`) that reference:
   - Root variables in workflow state
   - Nested properties within object variables

2. **Mapping Types**:
   - **Parameter Mappings**: `Record<ToolParameterName, WorkflowVariableName>` - Maps tool inputs to workflow variables
   - **Output Mappings**: `Record<ToolOutputName, WorkflowVariableName>` - Maps tool outputs to workflow variables

3. **Path Resolution Components**:
   - `parseVariablePath(path)`: Splits path into root name and property path array
   - `resolveVariablePath(variables, path)`: Resolves full path to actual value
   - `resolvePropertyPath(obj, propPath)`: Resolves property path within an object

## Sequence of Operations

### 1. Variable Path Resolution (Input)

When a step executes, the system:

1. Retrieves parameter mappings from the step configuration
2. For each parameter mapping:
   - Parses the variable path into root name and property path
   - Finds the root variable in workflow state
   - Resolves the property path to get the actual value
   - Validates type compatibility between parameter schema and variable schema
   - Passes resolved values to the tool execution

```
WorkflowStep.parameter_mappings → parseVariablePath → findVariableByRootName → resolvePropertyPath → Tool Execution
```

### 2. Variable Path Mapping (Output)

After tool execution:

1. Retrieves output mappings from the step configuration
2. For each output mapping:
   - Parses the output path to extract specific values from tool results
   - Finds or creates target variables in workflow state
   - Updates variable values with tool output results
   - Handles nested property updates for object variables

```
Tool Results → Output Mappings → parseVariablePath → Update Workflow State
```

### 3. Variable Path Validation

Before execution:

1. Validates parameter mappings against workflow state
   - Checks if mapped variables exist
   - Validates property paths against variable schemas
   - Verifies type compatibility between parameters and variables

2. Validates output mappings
   - Ensures target variables exist or can be created
   - Verifies type compatibility for output assignments

## Essential Operations

1. **Path Parsing**: `parseVariablePath(path) → { rootName, propPath }`
2. **Path Resolution**: `resolveVariablePath(variables, path) → { value, validPath, errorMessage }`
3. **Type Compatibility**: `isCompatibleType(paramSchema, varSchema) → boolean`
4. **Parameter Resolution**: `getResolvedParameters(step, workflow) → Record<ToolParameterName, SchemaValueType>`
5. **State Updates**: `getUpdatedWorkflowStateFromResults(step, outputs, workflow) → WorkflowVariable[]`

## UI Representation

The system provides UI utilities to:

1. Render variable paths with nested properties for selection
2. Filter variables by type compatibility with target parameters
3. Format variable paths for display
4. Provide visual cues for different data types

This path-based variable mapping system enables:
- Flexible referencing of nested data structures
- Type-safe connections between tools
- Dynamic resolution of values at runtime
- Clear visualization of data flow in the UI
