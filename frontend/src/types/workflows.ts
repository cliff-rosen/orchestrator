import { Tool } from './tools';

export type StepType = 'INPUT' | 'ACTION';

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
    readonly steps: WorkflowStep[];
} 