# Workflow and Schema Technical Overview

## Core Concepts

### Workflows

A workflow is a reusable sequence of steps that process data to achieve a specific goal. It defines:
- What steps it will perform
- What inputs it needs for each step (through WorkflowVariables)
- What outputs it produces for each step (through WorkflowVariables)

```typescript
interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly inputs: WorkflowVariable[];    // Variables to collect
    readonly outputs: WorkflowVariable[];   // Variables to produce
    readonly steps: WorkflowStep[];
}

interface WorkflowVariable {
    id: string;
    name: string;           // Display name
    description: string;    // Description for users
    schema: SchemaValue;    // Validation rules
}
```

### Steps

There are two types of steps:

1. INPUT Steps:
   - Collect user input based on workflow input variables
   - Validate user input against schemas
   - Store valid values in SchemaManager

2. ACTION Steps:
   - Use tools to process data
   - Map workflow variables to tool parameters
   - Map tool outputs back to workflow variables

```typescript
type StepType = 'INPUT' | 'ACTION';

interface WorkflowStep {
    id: string;
    label: string;
    description: string;
    stepType: StepType;
    tool?: Tool;  // Only for ACTION steps
}
```

### Tools

Tools are reusable components that perform specific actions. Each tool has a signature that defines its inputs and outputs.

```typescript
type ToolType = 'llm' | 'search' | 'retrieve';

interface Tool {
    type: ToolType;
    name?: string;
    description?: string;
    promptTemplate?: string;  // For LLM tools: template ID
    parameterMappings?: Record<string, ParameterMapping>;  // Maps inputs to tool parameters
    outputMappings?: Record<string, OutputMapping>;        // Maps tool outputs to workflow variables
}

export interface ParameterMapping {
    sourceVariable: string;    // Name of the source variable (input or previous step output)
    targetParameter: string;   // Name of the target parameter in the tool
}

export interface OutputMapping {
    sourceOutput: string;      // Name of the tool's output
    targetVariable: string;    // Name of the workflow variable to store the output
}

interface ToolSignature {
    parameters: ToolParameter[];  // What inputs the tool accepts
    outputs: ToolParameter[];    // What outputs the tool produces
}

interface ToolParameter {
    name: string;
    type: "string" | "number" | "boolean" | "string[]";
    description: string;
}

```

### Prompt Templates

LLM tools use prompt templates that define:
- The prompt text with variable tokens
- Expected input parameters
- Output schema definition

```typescript
interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    template: string;
    tokens: string[];  // Required input parameters
    output: {
        type: "string" | "object" | "string[]";
        description: string;
        schema?: {  // For object type outputs
            type: "object";
            fields: Record<string, {
                type: "string" | "number" | "boolean" | "string[]";
                description: string;
            }>;
        };
    };
}
```

## Data Flow

### Schema System

The schema system provides validation rules for variables:

```typescript
type SchemaValue = {
    name: string;
    type: "string" | "number" | "boolean" | "array" | "object";
    fields?: Record<string, {  // For object types
        name: string;
        type: "string" | "number" | "boolean" | "array";
        items?: SchemaValue;   // For array types
    }>;
    items?: SchemaValue;      // For array types
};
```

### Variable Resolution

Tools can access workflow variables through parameter mappings:
- Simple mappings: `"variable-name"`
- Nested object fields: `"variable-name.field-name"`

The SchemaManager maintains the state of all variables during workflow execution:

```typescript
interface SchemaManager {
    schemas: Record<string, SchemaEntry>;
    values: Record<string, any>;
    
    setSchema(key: string, schema: SchemaValue, role: 'input' | 'output'): void;
    setValues(key: string, value: any): void;
    getValue(key: string): any;
}
```

## Example Workflow

Here's a complete example of how these components work together:

```typescript
const researchWorkflow: Workflow = {
    id: 'research',
    name: 'Research Assistant',
    inputs: [{
        id: 'research-question',
        name: 'Research Question',
        description: 'The initial research question',
        schema: { name: 'question', type: 'string' }
    }],
    outputs: [{
        id: 'improved-question',
        name: 'Improved Question',
        description: 'The improved version',
        schema: {
            name: 'improvedQuestion',
            type: 'object',
            fields: {
                question: { name: 'question', type: 'string' },
                explanation: { name: 'explanation', type: 'string' }
            }
        }
    }],
    steps: [{
        id: 'question-improvement',
        label: 'Question Improvement',
        description: 'Review and improve question',
        stepType: 'ACTION',
        tool: {
            type: 'llm',
            promptTemplate: 'question-improver',
            parameterMappings: {
                'question': 'research-question'
            },
            outputMappings: {
                'improvedQuestion': 'improved-question'
            }
        }
    }]
};