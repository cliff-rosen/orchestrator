# Schema and Variable System Documentation

Workflows and tools operate on data through several layers of abstraction:

1. **Schema**: Purely describes structure and constraints
   ```typescript
   { type: 'string', array_type: false }
   ```
   Think of schemas like class definitions in object-oriented programming - they define the shape and rules, but don't contain actual data.

2. **Variable**: A schema plus identifiers and an optional value
   ```typescript
   { variable_id: 'var1', name: 'person_age', schema: { type: 'number' }, value: 42 }
   ```
   Variables are like instances/objects - they contain actual data that conforms to a schema (similar to how objects conform to their class definition).

For example, just as you might have:
```typescript
class Address {             // Nested class definition
    street: string;
    city: string;
}

class Person {              // Class definition (like Schema)
    age: number;
    name: string;
    address: Address;       // Nested object
}

const bob = new Person();   // Instance with data
bob.age = 42;
bob.name = "Bob";
bob.address = {
    street: "123 Main St",
    city: "Springfield"
};
```

Our system uses:
```typescript
const addressSchema: Schema = {     // Nested schema definition
    type: 'object',
    array_type: false,
    fields: {
        street: { type: 'string', array_type: false },
        city: { type: 'string', array_type: false }
    }
};

const personSchema: Schema = {      // Schema definition
    type: 'object',
    array_type: false,
    fields: {
        age: { type: 'number', array_type: false },
        name: { type: 'string', array_type: false },
        address: addressSchema      // Nested schema
    }
};

const person: Variable = {          // Variable with value
    variable_id: 'var1',           // System-wide unique ID
    name: 'bob',                   // Reference identifier (matches class example)
    schema: personSchema,          // Structure definition
    value: {                       // Actual data
        age: 42,
        name: "Bob",
        address: {
            street: "123 Main St",
            city: "Springfield"
        }
    }
};
```

## 1. Core Type System

### Basic Types
```typescript
// Value types that can be used in schemas
type PrimitiveType = 'string' | 'number' | 'boolean';
type ComplexType = 'object' | 'file';
type ValueType = PrimitiveType | ComplexType;

// Schema - purely describes structure
interface Schema {
    type: ValueType;
    array_type: boolean;  // If true, the value will be an array of the base type
    // Only present when type is 'object'
    fields?: Record<string, Schema>;
    // Format constraints
    format?: string;
    content_types?: string[];
}

// Runtime value type - the basic types that can be stored
type SchemaValueType =
    | string
    | number
    | boolean
    | object
    | FileValue;

// File value type
interface FileValue {
    file_id: string;
    name: string;
    description?: string;  // File-level description for users
    content: Uint8Array;
    mime_type: string;
    size: number;
    extracted_text?: string;
    created_at: string;
    updated_at: string;
}
```

### Variables and Values
Variables combine a schema with identifiers and a value. Each variable needs:
- A `variable_id` for system-level unique identification
- A `name` for reference within its context (like field name in objects)
- A schema that defines its structure
- An optional value that matches the schema's structure

For example:
```typescript
// A basic schema just describes structure
const numberSchema: Schema = {
    type: 'number',
    array_type: false
};

// An object schema has named fields
const personSchema: Schema = {
    type: 'object',
    array_type: false,
    fields: {
        // Field names map directly to their schemas
        age: { type: 'number', array_type: false },
        first_name: { type: 'string', array_type: false }
    }
};

// A variable combines schema with identifiers and value
const ageVar = {
    variable_id: 'var1',          // System-wide unique ID
    name: 'person_age',           // Reference name in current context
    schema: numberSchema,         // Structure definition
    value: 42                     // Actual data
};
```

```typescript
// Base variable type - combines schema with identifiers and value
interface Variable {
    variable_id: string;     // System-wide unique ID
    name: string;           // Reference name in current context
    schema: Schema;         // Structure definition
    value?: SchemaValueType; // Actual data
    description?: string;    // Human-readable description
}

// Workflow variable - adds I/O type and required flag
interface WorkflowVariable extends Variable {
    io_type: 'input' | 'output';
    // Required flag only applies to inputs and defaults to true
    required?: boolean;
}

// Job variable - runtime instance with required flag
interface JobVariable extends Variable {
    required: boolean;
}

// Type-safe variable references
type VariableName = string & { readonly __brand: unique symbol };
```

## 2. Tools and Parameters

### Tool Structure
Tools are the processing units in our system. They define:
- What inputs they accept (parameters)
- What outputs they produce
- How to process the inputs into outputs

```typescript
// Tool parameter definition
interface ToolParameter {
    schema: Schema;
    required?: boolean;
    default?: SchemaValueType;
    description?: string;    // describes this parameter to tool users
}

// Tool output definition
interface ToolOutput {
    schema: Schema;
    description?: string;    // describes this output to tool users
}

// Complete tool definition
interface Tool {
    tool_id: string;
    name: string;
    description: string;
    tool_type: 'llm' | 'search' | 'retrieve' | 'utility';
    signature: {
        parameters: ToolParameter[];
        outputs: ToolOutput[];
    };
}
```

## 3. Workflow Structure

### Steps and Mappings
Workflows connect tools together by:
- Defining input/output variables
- Creating steps that use tools
- Mapping variables to tool parameters

```typescript
// Workflow step definition
interface WorkflowStep {
    step_id: string;
    workflow_id: string;
    label: string;
    description: string;
    step_type: 'ACTION' | 'INPUT';
    tool?: Tool;
    tool_id?: string;
    prompt_template?: string;
    // Maps between tool and workflow variables
    parameter_mappings: Record<VariableName, VariableName>;
    output_mappings: Record<VariableName, VariableName>;
}

// Complete workflow definition
interface Workflow {
    workflow_id: string;
    name: string;
    description?: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    inputs?: WorkflowVariable[];   // Variables to collect from user
    outputs?: WorkflowVariable[];  // Variables produced by workflow
    steps: WorkflowStep[];
}
```

## 4. Runtime Execution

### Job Structure
Jobs are runtime instances of workflows that:
- Collect actual values for input variables
- Execute steps in sequence
- Store output values as they're produced

```typescript
// Job step - runtime instance of workflow step
interface JobStep {
    step_id: string;
    job_id: string;
    sequence_number: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output_data?: Record<VariableName, SchemaValueType>;
    parameter_mappings: Record<VariableName, VariableName>;
    output_mappings: Record<VariableName, VariableName>;
}

// Complete job definition
interface Job {
    job_id: string;
    workflow_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input_variables: JobVariable[];
    output_data?: Record<VariableName, SchemaValueType>;
    steps: JobStep[];
}
```

## 5. Key Concepts

1. **Schema vs Value**
   - `Schema`: Defines the shape/structure of data
   - `SchemaValueType`: Actual runtime values that conform to a schema

2. **Variable Types**
   - `Variable`: Base type combining schema and value
   - `WorkflowVariable`: Adds I/O type and required flag (for inputs)
   - `JobVariable`: Runtime instance with required flag

3. **Type Safety**
   - Uses branded types (`VariableName`) for variable references
   - Ensures type-safe mappings between tools and workflows

4. **Data Flow**
   - Workflow defines structure (inputs → steps → outputs)
   - Job provides runtime values and execution state
   - Tools process values according to their signatures