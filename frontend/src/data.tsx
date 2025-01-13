export interface WorkflowStep {
    label: string;
    description: string;
}

export interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly steps: readonly WorkflowStep[];
}

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
            },
            {
                label: 'Question Improvement',
                description: 'Review and approve suggested improvements to your question',
            },
            {
                label: 'Final Answer',
                description: 'Review and approve the final answer',
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
            },
            {
                label: 'Analysis',
                description: 'AI analysis of your situation',
            }
        ]
    }
] as const; 