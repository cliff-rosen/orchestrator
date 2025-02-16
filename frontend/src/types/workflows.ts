import { Tool } from './tools';
import { SchemaValue } from './schema';

export enum WorkflowStatus {
    DRAFT = 'draft',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
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
    name: string;
    description?: string;
    schema: SchemaValue;
    variable_type: 'input' | 'output';
    value?: any;  // The current runtime value of this variable
}

export interface WorkflowStep {
    step_id: string;
    workflow_id: string;
    label: string;
    description?: string;
    step_type: WorkflowStepType;
    tool_id?: string;
    prompt_template?: string;
    parameter_mappings: Record<string, string>;  // Maps tool parameter names to workflow variable names
    output_mappings: Record<string, string>;    // Maps tool output names to workflow variable names
    sequence_number: number;
    created_at: string;
    updated_at: string;
    tool?: Tool;
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
        schema: {
            name: "query",
            type: "string",
            description: "Search query text"
        },
        variable_type: 'input'
    }],
    outputs: [{
        variable_id: "results",
        name: "Search Results",
        description: "Found documents",
        schema: {
            name: "results",
            type: "array",
            items: {
                name: "document",
                type: "string",
                description: "Document content"
            }
        },
        variable_type: 'output'
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
                    name: "searchQuery",
                    description: "The search query",
                    schema: {
                        name: "searchQuery",
                        type: "string"
                    }
                }],
                outputs: [{
                    name: "documents",
                    description: "Found documents",
                    schema: {
                        name: "documents",
                        type: "array",
                        items: {
                            name: "document",
                            type: "string"
                        }
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
        name: "question",
        description: "",
        schema: {
            name: "question",
            type: "string",
            description: "The question to improve"
        },
        variable_type: "input"
    }],
    outputs: []
}
