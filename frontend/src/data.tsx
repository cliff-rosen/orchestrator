export type ToolType = 'llm' | 'search' | 'retrieve';

export interface Tool {
    type: ToolType;
    name?: string;
    description?: string;
}

export interface WorkflowStep {
    id: string;
    label: string;
    description: string;
    stepType: 'INPUT' | 'ACTION';
    tool?: Tool;
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
                id: 'question-input',
                label: 'Initial Question',
                description: 'Enter your research question with as much context as possible',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Question Generator',
                    description: 'AI tool to generate research questions'
                }
            },
            {
                id: 'question-improvement',
                label: 'Question Improvement',
                description: 'Review and approve suggested improvements to your question',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Question Improver',
                    description: 'AI tool to improve research questions'
                }
            },
            {
                id: 'final-answer',
                label: 'Final Answer',
                description: 'Review and approve the final answer',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Answer Generator',
                    description: 'AI tool to generate comprehensive answers'
                }
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
                id: 'story-input',
                label: 'Initial Story',
                description: 'Tell us your story',
                stepType: 'INPUT'
            },
            {
                id: 'analysis',
                label: 'Analysis',
                description: 'AI analysis of your situation',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Situation Analyzer',
                    description: 'AI tool to analyze social situations'
                }
            }
        ]
    }
] as const; 