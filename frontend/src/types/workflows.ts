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
    id: string;
    label: string;
    description: string;
    stepType: WorkflowStepType;
    tool?: Tool;
    parameterMappings?: Record<string, string>;
    outputMappings?: Record<string, string>;
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
- parameter mappings: maps state variables to tool inputs parameters
- output mappings: maps tool outputs to state variables

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
        id: "search_step",
        label: "Search Documents",
        description: "Search through document database",
        stepType: WorkflowStepType.ACTION,
        tool: {
            id: "search_tool",
            type: "search",
            name: "Document Search",
            description: "Searches document database",
            signature: {
                parameters: [{
                    name: "searchQuery",
                    type: "string"
                }],
                outputs: [{
                    name: "documents",
                    type: "string[]"
                }]
            }
        },
        parameterMappings: {
            "searchQuery": "query"  // Maps workflow input to tool parameter
        },
        outputMappings: {
            "documents": "results"  // Maps tool output to workflow output
        }
    }]
}