import { Tool } from './tools';
import { SchemaValue } from '../hooks/schema/types';

export type StepType = 'INPUT' | 'ACTION';

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
    stepType: StepType;
    tool?: Tool;
}

export interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly inputs: WorkflowVariable[];
    readonly outputs: WorkflowVariable[];
    readonly steps: WorkflowStep[];
}

/* 
Explanation of inputs, outputs and parameter mappings:
- inputs: variables that are collected from the user
- outputs: variables that are produced by the workflow
- parameter mappings: maps the inputs and outputs to the variables
note: outputs produced by workflow can be used as inputs for other steps



*/