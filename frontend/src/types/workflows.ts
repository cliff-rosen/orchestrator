import { Tool } from './tools';
import { SchemaValue } from '../hooks/schema/types';

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
    action: (data?: any) => Promise<void>;
    actionButtonText: (state?: any) => string;
    isDisabled?: (state?: any) => boolean;
}

export interface WorkflowVariable {
    id: string;
    name: string;
    description: string;
    schema: SchemaValue;
}

export interface WorkflowStep {
    step_id: string;
    label: string;
    description: string;
    step_type: WorkflowStepType;
    tool?: Tool;
    tool_id?: string;
    parameter_mappings?: Record<string, string>;
    output_mappings?: Record<string, string>;
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
        id: "query",
        name: "Search Query",
        description: "What to search for",
        schema: { name: "query", type: "string" }
    }],
    outputs: [{
        id: "results",
        name: "Search Results",
        description: "Found documents",
        schema: { name: "results", type: "array", items: { name: "document", type: "string" } }
    }],
    steps: [{
        step_id: "search_step",
        label: "Search Documents",
        description: "Search through document database",
        step_type: WorkflowStepType.ACTION,
        tool: {
            tool_id: "search_tool",
            tool_type: "search",
            name: "Document Search",
            description: "Searches document database",
            signature: {
                parameters: [{
                    name: "searchQuery",
                    description: "The search query",
                    schema: { name: "searchQuery", type: "string" }
                }],
                outputs: [{
                    name: "documents",
                    description: "Found documents",
                    schema: { name: "documents", type: "array", items: { name: "document", type: "string" } }
                }]
            }
        },
        parameter_mappings: {
            "searchQuery": "query"  // Maps workflow input to tool parameter
        },
        output_mappings: {
            "documents": "results"  // Maps tool output to workflow output
        }
    }]
}