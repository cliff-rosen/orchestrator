# Template Variable Handling Specification

## Overview
This document specifies how variables are handled in prompt templates, including syntax, type system, and validation rules for variable mappings in workflows.

## Data Models and Schemas

### PromptTemplate
```typescript
interface PromptTemplate {
    template_id: string;
    name: string;
    description: string;
    template: string;                 // The template text containing both variable types
    regular_variables: Variable[];    // Variables using {{name}} syntax
    file_variables: Variable[];       // Variables using <<file:name>> syntax
    system_message?: string;
    output_schema: OutputSchema;
}

interface Variable {
    name: string;
    type: VariableType;
    description?: string;
    required: boolean;
}
```

### WorkflowVariable
```typescript
interface WorkflowVariable {
    variable_id: string;
    name: string;
    type: VariableType;
    schema: VariableSchema;
    description?: string;
    value?: any;
}

interface VariableSchema {
    type: 'string' | 'number' | 'boolean' | 'file';
    format?: string;        // e.g., 'pdf' for file type
    contentTypes?: string[]; // e.g., ['application/pdf'] for file type
}
```

### WorkflowStep
```typescript
interface WorkflowStep {
    step_id: string;
    workflow_id: string;
    tool_id: string;
    prompt_template_id?: string;
    parameter_mappings: {
        [templateVar: string]: string;  // Maps template vars to workflow vars
    };
}
```

## Variable Types
The system supports two distinct categories of variables:

### Regular Variables
- Syntax: `{{variable_name}}`
- Basic Types:
  - string
  - number
  - boolean
  - array (of basic types)

### File Variables
- Syntax: `<<file:variable_name>>`
- Specifically for handling file content, particularly PDFs
- Contains both text and image content
- Must be mapped to workflow variables of type 'file'

## Type System

### Strict Type Matching
The system enforces strict type matching between workflow variables and template parameters:

| Source Type (Workflow) | Target Type (Template) | Allowed |
|----------------------|---------------------|---------|
| string              | string              | ✓       |
| number              | number              | ✓       |
| boolean             | boolean             | ✓       |
| file                | file                | ✓       |
| string              | file                | ✗       |
| file                | string              | ✗       |
| number              | string              | ✗       |
| string              | number              | ✗       |

No automatic type conversion is performed. Types must match exactly.

## File Variable Processing

### Message Construction
When a template contains file variables, the system constructs a single chat message with multiple content parts:

1. Template text before the file variable (as a text content part)
2. File content parts:
   - Extracted text (as a text content part)
   - Images (as image content parts)
3. Template text after the file variable (as a text content part)

Example:
```
Template:
"Please analyze this document: <<file:document>> considering these aspects: {{aspects}}"

Becomes a message with content parts:
[
    {"text": "Please analyze this document: "},
    {"text": "<extracted PDF text>"},
    {"image_data": "...", "image_mime_type": "image/jpeg"},
    {"text": " considering these aspects: security, performance"}
]
```

### Order Preservation
- Content parts are processed in sequence by the LLM
- The order of text and images from PDFs is preserved
- Template text is split around file variables to maintain context

## Validation Rules

### Template Definition
1. File variables must use the `<<file:name>>` syntax
2. Regular variables must use the `{{name}}` syntax
3. Variable names must be unique within a template
4. Variable names must be valid identifiers (alphanumeric and underscore)

### Workflow Mapping
1. Each template variable must have a corresponding workflow variable mapping
2. File variables must map to workflow variables of type 'file'
3. Regular variables must map to workflow variables of matching basic types
4. No mixed-type mappings are allowed

### Runtime Validation
1. All required variables must have values
2. File variables must have valid file IDs
3. Files must exist and be accessible
4. PDFs must have either extracted text or images (preferably both)

## Error Handling

### Frontend
1. Prevent invalid mappings in the UI
2. Show clear error messages for type mismatches
3. Validate variable names during template editing
4. Provide visual distinction between regular and file variables

### Backend
1. Validate all mappings before execution
2. Check file existence and accessibility
3. Verify file content availability
4. Return clear error messages for:
   - Invalid mappings
   - Missing files
   - Invalid file content
   - Permission issues

## Implementation Notes

### Data Models
- Update PromptTemplate model to track file variables separately
- Update WorkflowVariable model to support file type and formats
- Update WorkflowStep model parameter mapping validation

### Frontend Components
- PromptTemplate component to handle both variable types
- PromptTemplateEditor to support both variable syntaxes
- DataFlowMapper to enforce type matching
- StepConfiguration to validate mappings
- WorkflowVariableEditor to support file type configuration
- Clear visual distinction between variable types in all components

### Backend Services
- WorkflowService:
  - Strict validation in variable mapping
  - Separate handling for file and regular variables
  - No type coercion or conversion
  - File content aggregation for PDFs
- TemplateService:
  - Variable extraction and validation
  - Separate tracking of regular and file variables
- FileService:
  - PDF content extraction
  - Image extraction and management
  - Content type validation

### Database Changes
- Add file_variables to prompt_templates table
- Update workflow_variables table schema for file types
- Update variable mapping constraints

### API Updates
- Update template CRUD endpoints
- Update workflow variable endpoints
- Update step configuration endpoints
- Add file content processing endpoints

### Testing Requirements
- Unit tests for variable type validation
- Integration tests for file processing
- End-to-end tests for template execution
- Validation error handling tests
- File content processing tests
