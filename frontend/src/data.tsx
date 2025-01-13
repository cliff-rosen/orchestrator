export type SchemaField = {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    fields?: SchemaField[];  // For nested objects
    itemType?: SchemaField;  // For arrays
};

export type Schema = {
    fields: SchemaField[];
};

export type Tool = {
    name: string;
    description: string;
};

export interface WorkflowStep {
    label: string;
    description: string;
    tool: Tool;
    inputSchema: Schema;
    outputSchema: Schema;
}

export interface Workflow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly steps: readonly WorkflowStep[];
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
                tool: {
                    name: 'question_input',
                    description: 'Input a research question'
                },
                inputSchema: {
                    fields: [
                        {
                            name: 'question',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'context',
                            type: 'string',
                            required: false
                        }
                    ]
                },
                outputSchema: {
                    fields: [
                        {
                            name: 'question',
                            type: 'string',
                            required: true
                        }
                    ]
                }
            },
            {
                label: 'Question Improvement',
                description: 'Review and approve suggested improvements to your question',
                tool: {
                    name: 'improve_question',
                    description: 'Improve the research question'
                },
                inputSchema: {
                    fields: [
                        {
                            name: 'question',
                            type: 'string',
                            required: true
                        }
                    ]
                },
                outputSchema: {
                    fields: [
                        {
                            name: 'improvedQuestion',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'improvements',
                            type: 'array',
                            required: true,
                            itemType: {
                                name: 'improvement',
                                type: 'string',
                                required: true
                            }
                        }
                    ]
                }
            },
            {
                label: 'Final Answer',
                description: 'Review and approve the final answer',
                tool: {
                    name: 'generate_answer',
                    description: 'Generate final research answer'
                },
                inputSchema: {
                    fields: [
                        {
                            name: 'question',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'context',
                            type: 'object',
                            required: true,
                            fields: [
                                {
                                    name: 'sources',
                                    type: 'array',
                                    required: true,
                                    itemType: {
                                        name: 'source',
                                        type: 'object',
                                        required: true,
                                        fields: [
                                            {
                                                name: 'url',
                                                type: 'string',
                                                required: true
                                            },
                                            {
                                                name: 'content',
                                                type: 'string',
                                                required: true
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                },
                outputSchema: {
                    fields: [
                        {
                            name: 'answer',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'confidence',
                            type: 'number',
                            required: true
                        },
                        {
                            name: 'citations',
                            type: 'array',
                            required: true,
                            itemType: {
                                name: 'citation',
                                type: 'object',
                                required: true,
                                fields: [
                                    {
                                        name: 'source',
                                        type: 'string',
                                        required: true
                                    },
                                    {
                                        name: 'text',
                                        type: 'string',
                                        required: true
                                    }
                                ]
                            }
                        }
                    ]
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
                label: 'Initial Story',
                description: 'Tell us your story',
                tool: {
                    name: 'story_input',
                    description: 'Input your AITA story'
                },
                inputSchema: {
                    fields: [
                        {
                            name: 'story',
                            type: 'string',
                            required: true
                        }
                    ]
                },
                outputSchema: {
                    fields: [
                        {
                            name: 'story',
                            type: 'string',
                            required: true
                        }
                    ]
                }
            },
            {
                label: 'Analysis',
                description: 'AI analysis of your situation',
                tool: {
                    name: 'analyze_aita',
                    description: 'Analyze AITA story'
                },
                inputSchema: {
                    fields: [
                        {
                            name: 'story',
                            type: 'string',
                            required: true
                        }
                    ]
                },
                outputSchema: {
                    fields: [
                        {
                            name: 'verdict',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'explanation',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'rating',
                            type: 'number',
                            required: true
                        }
                    ]
                }
            }
        ]
    }
] as const; 