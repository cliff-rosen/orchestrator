# Technical Overview

## Core Concepts

### Workflows

A workflow is a reusable sequence of steps that process data to achieve a specific goal. It defines:
- What inputs it needs (through WorkflowVariables)
- What outputs it produces (through WorkflowVariables)
- What steps it will perform
- How data flows between steps

At runtime, workflows:
- Initialize by registering all variables with SchemaManager
- Start with an INPUT step to gather required variables
- Execute ACTION steps in sequence
- Track intermediate results
- Produce final outputs

### Workflow Initialization

When a workflow instance starts:
```typescript
// In the Workflow component
useEffect(() => {
    if (!localWorkflow && initialWorkflow) {
        // Set up local state
        setLocalWorkflow(initialWorkflow);

        // Register all input variables with SchemaManager
        initialWorkflow.inputs?.forEach(input => {
            stateManager.setSchema(input.name, input.schema, 'input');
        });

        // Register all output variables with SchemaManager
        initialWorkflow.outputs?.forEach(output => {
            stateManager.setSchema(output.name, output.schema, 'output');
        });
    }
}, [initialWorkflow, localWorkflow, stateManager]);
```

This initialization:
1. Happens once when the workflow starts
2. Registers all WorkflowVariables with the SchemaManager
3. Sets up validation rules for all variables
4. Prepares the runtime state for execution

```typescript
interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly inputs: WorkflowVariable[];    // Variables to collect in INPUT step
    readonly outputs: WorkflowVariable[];   // Variables to produce in ACTION steps
    readonly steps: WorkflowStep[];
}
```

### Steps

There are two types of steps that handle variables differently:

1. INPUT Steps:
   - Use WorkflowVariables to define what inputs to collect
   - Generate forms based on variable schemas
   - Validate user input against schemas
   - Store valid values in SchemaDictionary

2. ACTION Steps:
   - Use tools to process data
   - Read input values from SchemaDictionary
   - Write output values to SchemaDictionary

```typescript
type StepType = 'INPUT' | 'ACTION';

interface WorkflowStep {
    id: string;
    label: string;
    description: string;
    stepType: StepType;
    tool?: Tool;  // Only for ACTION steps
    outputMappings?: Record<string, string>;  // Maps tool outputs to workflow variables
}
```

### Tools

Tools are reusable components that perform specific actions like:
- Running language models (llm)
- Searching for information (search)
- Retrieving data (retrieve)

Each tool:
- Takes specific inputs
- Produces specific outputs
- Can be configured with parameters
- Maps its inputs/outputs to workflow variables

```typescript
type ToolType = 'llm' | 'search' | 'retrieve';

interface Tool {
    type: ToolType;
    name?: string;
    description?: string;
    parameterMappings?: Record<string, string>;  // Maps: workflow variable -> tool input
    outputMappings?: Record<string, string>;     // Maps: tool output -> workflow variable
    promptTemplate?: string;  // For LLM tools: template ID
}
```

## Data Flow

### Variables and Schema Management

Variables are handled differently depending on the step type:

1. In INPUT Steps:
```typescript
interface WorkflowVariable {
    id: string;
    name: string;           // Form field identifier
    description: string;    // Form field label
    schema: SchemaValue;    // Validation rules for user input
}

// Example: Generating input form
const InputStep = ({ workflow, stateManager }) => {
    workflow.inputs.forEach(input => {
        // Generate form field based on schema
        const value = stateManager.getValue(input.name);
        // Validate against schema before storing
        if (isValid(value, input.schema)) {
            stateManager.setValues(input.name, value);
        }
    });
};
```

2. In ACTION Steps:
```typescript
interface SchemaEntry {
    role: 'input' | 'output';
    schema: SchemaValue;
}

interface SchemaManager {
    schemas: Record<string, SchemaEntry>;
    values: Record<string, any>;
    
    // Used by tools to access variables
    setSchema(key: string, schema: SchemaValue, role: 'input' | 'output'): void;
    setValues(key: string, value: any): void;
    getValue(key: string): any;
}

// Example: Tool accessing variables
const toolInputs = Object.entries(tool.parameterMappings).reduce(
    (inputs, [param, varName]) => ({
        ...inputs,
        [param]: stateManager.getValue(varName)
    }), 
    {}
);
```

### Schema System

The schema system provides validation rules for both input collection and tool execution:

```typescript
type SchemaValue = 
    | { type: 'string', format?: string }
    | { type: 'number', minimum?: number, maximum?: number }
    | { type: 'boolean' }
    | { type: 'array', items: SchemaValue }
    | { type: 'object', properties: Record<string, SchemaValue> };
```

## Example: Research Workflow

This example shows both INPUT and ACTION handling:
```typescript
const workflow: Workflow = {
    id: 'research',
    name: 'Research Assistant',
    inputs: [
        {
            id: 'research-question',
            name: 'research-question',
            description: 'Enter your research question:', // Used in input form
            schema: { name: 'question', type: 'string' }
        }
    ],
    steps: [
        // First: INPUT step to collect research question
        {
            id: 'input-step',
            label: 'Research Question',
            description: 'Provide your question',
            stepType: 'INPUT'
        },
        // Then: ACTION step to process it
        {
            id: 'question-improvement',
            label: 'Question Improvement',
            description: 'Review and improve question',
            stepType: 'ACTION',
            tool: {
                type: 'llm',
                parameterMappings: {
                    'question': 'research-question' // Read from SchemaDictionary
                },
                outputMappings: {
                    'improvedQuestion': 'improved-question' // Write to SchemaDictionary
                }
            }
        }
    ]
};