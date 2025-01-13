export type Tool = {
    name: string;
    description: string;
};

export type StepType = 'LLM' | 'SEARCH' | 'RETRIEVE' | 'INPUT';

export interface WorkflowStep {
    label: string;
    description: string;
    stepType: StepType;
    inputMap: Record<string, string>;
    outputMap: Record<string, string>;
}

export interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly steps: WorkflowStep[];
}

// Example research workflow with schemas
export const WORKFLOWS: readonly Workflow[] = [
    {
        id: 'research',
        name: 'Research Assistant',
        description: 'AI-powered research workflow to analyze questions and find answers',
        path: '/workflow/research',
        steps: [
            {
                label: 'Initial Question',
                description: 'Enter your research question with as much context as possible',
                stepType: 'LLM',
                inputMap: {},
                outputMap: {}
            },
            {
                label: 'Question Improvement',
                description: 'Review and approve suggested improvements to your question',
                stepType: 'LLM',
                inputMap: {},
                outputMap: {}
            },
            {
                label: 'Final Answer',
                description: 'Review and approve the final answer',
                stepType: 'LLM',
                inputMap: {},
                outputMap: {}
            }
        ]
    },
    {
        id: 'aita',
        name: 'AITA',
        description: 'Find out if you are the asshole',
        path: '/workflow/aita',
        steps: [
            {
                label: 'Initial Story',
                description: 'Tell us your story',
                stepType: 'LLM',
                inputMap: {},
                outputMap: {}
            },
            {
                label: 'Analysis',
                description: 'AI analysis of your situation',
                stepType: 'LLM',
                inputMap: {},
                outputMap: {}
            }
        ]
    }
] as const; 