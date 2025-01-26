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
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    status: WorkflowStatus;
    path: string;
    inputs: any[];
    outputs: any[];
    steps: {
        id: string;
        label: string;
        description: string;
        stepType: WorkflowStepType;
    }[];
}

/* 
Explanation of inputs, outputs and parameter mappings:
- inputs: variables that are collected from the user
- outputs: variables that are produced by the workflow
- parameter mappings: maps the inputs and outputs to the variables
note: outputs produced by workflow can be used as inputs for other steps



*/