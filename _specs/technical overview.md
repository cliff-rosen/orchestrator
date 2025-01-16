# Technical Overview

## Workflow System

### Variables and Data Flow

Workflows manage data through a system of variables and mappings:

1. **Workflow Variables**
   - Defined by `WorkflowVariable` interface
   - Contains id, name, description, and schema
   - Two categories: inputs (collected from user) and outputs (produced by workflow)

2. **Tool Integration**
   - Tools define their parameters and outputs using strongly-typed names
   - Two types of mappings:
     - Parameter Mappings: Connect tool parameters to workflow variables
     - Output Mappings: Connect tool outputs to workflow variables

3. **Data Flow**
   - Workflow inputs are collected from users
   - Tools receive inputs via parameter mappings
   - Tool outputs are captured via output mappings
   - Mapped outputs can be used as inputs for subsequent steps

### Type Safety

The system uses branded types to ensure type safety in mappings:
- `ToolParameterName`: Represents a tool's parameter name
- `ToolOutputName`: Represents a tool's output name
- `WorkflowVariableName`: Represents a workflow variable name

This ensures that mappings are correctly typed and maintains clear distinction between tool and workflow variables.

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
    parameterMappings?: ParameterMappingType;  // Maps tool parameters to workflow variables
    outputMappings?: OutputMappingType;        // Maps tool outputs to workflow variables
}

// Strongly typed names for mapping
type ToolParameterName = string & { readonly __brand: unique symbol };
type ToolOutputName = string & { readonly __brand: unique symbol };
type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Mapping types
type ParameterMappingType = Record<ToolParameterName, WorkflowVariableName>;    // tool parameter -> workflow variable
type OutputMappingType = Record<ToolOutputName, WorkflowVariableName>;          // tool output -> workflow variable

interface ToolSignature {
    parameters: ToolParameter[];  // What inputs the tool accepts
    outputs: ToolParameter[];    // What outputs the tool produces
}

interface ToolParameter {
    name: string;
    type: "string" | "number" | "boolean" | "string[]";
    description?: string;
}
```

The mapping system ensures type safety by:
- Using branded types to distinguish between tool and workflow variables
- Maintaining clear directionality in mappings (tool -> workflow)
- Providing compile-time type checking for variable names

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