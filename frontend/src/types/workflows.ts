import { Tool } from './tools';
import { SchemaValue, ValueType } from './schema';

export enum WorkflowStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived'
}

export enum WorkflowStepType {
    ACTION = 'ACTION',
    INPUT = 'INPUT'
}

export interface RuntimeWorkflowStep extends WorkflowStep {
    action: () => Promise<void>;
    actionButtonText: () => string;
    isDisabled: () => boolean;
}

export interface WorkflowVariable {
    variable_id: string;
    schema: SchemaValue;
    io_type: 'input' | 'output';
    value?: any;  // The current runtime value of this variable
}

export interface WorkflowStep {
    step_id: string;
    workflow_id: string;
    label: string;
    description: string;
    step_type: 'ACTION' | 'INPUT';
    tool?: Tool;
    tool_id?: string;
    prompt_template?: string;
    parameter_mappings: Record<string, string>;
    output_mappings: Record<string, string>;
    sequence_number: number;
    created_at: string;
    updated_at: string;
}

export interface Workflow {
    workflow_id: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    inputs?: WorkflowVariable[];
    outputs?: WorkflowVariable[];
    steps: WorkflowStep[];
}

// Helper function to create an array schema
export const createArraySchema = (name: string, itemType: ValueType, description?: string): SchemaValue => ({
    name,
    type: itemType,  // The base type of the items
    description,
    array_type: true  // This indicates it's an array of itemType
});

// Default workflow with empty arrays
export const DEFAULT_WORKFLOW: Workflow = {
    workflow_id: '',
    name: 'Untitled Workflow',
    description: 'A new custom workflow',
    status: WorkflowStatus.DRAFT,
    steps: [],
    inputs: [],
    outputs: []
};


/* 
Explanation of inputs, outputs and parameter mappings:
- inputs: variables that are collected from the user
- outputs: variables that are produced by the workflow
- collectively, inputs and outputs are the state variables for the workflow
- parameter_mappings: maps state variables to tool inputs parameters
- output_mappings: maps tool outputs to state variables

*/

export const exampleWorkflow: Workflow = {
    workflow_id: "doc_search_workflow",
    name: "Document Search",
    status: WorkflowStatus.DRAFT,
    inputs: [{
        variable_id: "query",
        name: "Search Query",
        description: "What to search for",
        type: "string",
        schema: {
            name: "query",
            type: "string",
            description: "Search query text"
        },
        io_type: 'input'
    }],
    outputs: [{
        variable_id: "results",
        name: "Search Results",
        description: "Found documents",
        schema: {
            name: "results",
            type: "string",  // base type of array items
            array_type: true,  // indicates this is an array of strings
            description: "Found documents"
        },
        io_type: 'output'
    }],
    steps: [{
        step_id: "search_step",
        workflow_id: "doc_search_workflow",
        label: "Search Documents",
        description: "Search through document database",
        step_type: WorkflowStepType.ACTION,
        tool_id: "search_tool",
        parameter_mappings: {
            "searchQuery": "query"
        },
        output_mappings: {
            "documents": "results"
        },
        sequence_number: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tool: {
            tool_id: "search_tool",
            name: "Document Search",
            description: "Searches document database",
            tool_type: "search",
            signature: {
                parameters: [{
                    schema: {
                        name: "searchQuery",
                        type: "string",
                        array_type: false,
                        description: "The search query"
                    }
                }],
                outputs: [{
                    schema: {
                        name: "documents",
                        type: "string",
                        array_type: true,
                        description: "Found documents"
                    }
                }]
            }
        }
    }]
}

export const exampleWorkflow2: Workflow = {
    workflow_id: "example-workflow-2",
    name: "Hello Workflow 1",
    description: "A new custom workflow",
    status: WorkflowStatus.DRAFT,
    steps: [
        {
            label: "Improve question",
            description: "Configure this step by selecting a tool and setting up its parameters",
            step_type: WorkflowStepType.ACTION,
            tool_id: "llm",
            prompt_template: "question-improver",
            parameter_mappings: {},
            output_mappings: {},
            step_id: "step-1",
            workflow_id: "e4cd87e3-9d58-4be0-8270-d996c57e9a6a",
            sequence_number: 0,
            created_at: "2025-02-04T16:51:52",
            updated_at: "2025-02-04T16:51:52",
            tool: {
                tool_id: "llm",
                name: "Language Model",
                description: "Executes prompts using a language model",
                tool_type: "llm",
                signature: {
                    parameters: [],
                    outputs: []
                }
            }
        }
    ],
    inputs: [{
        variable_id: "var-1738689200900-rrjspuoia",
        description: "",
        type: "string",
        schema: {
            name: "question",
            type: "string",
            array_type: false,
            description: "The question to improve"
        },
        io_type: "input"
    }],
    outputs: []
}

// Helper function to create a basic schema
export const createBasicSchema = (name: string, type: ValueType, description?: string): SchemaValue => ({
    name,
    type,
    description,
    array_type: false
});

