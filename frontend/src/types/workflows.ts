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
    outputMappings?: Record<string, string>; // Maps tool outputs to workflow variables
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

// Workflow hierarchy
// Workflow -> WorkflowStep -> WorkflowVariable
// Workflow -> WorkflowVariable
// WorkflowStep -> Record<string, string>
// WorkflowVariable -> SchemaValue -> {name: string, type: string, required: boolean}

