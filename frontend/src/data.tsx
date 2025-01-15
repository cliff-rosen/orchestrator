import { ToolType, ToolParameter, ToolSignature, Tool, PromptTemplate, Workflow } from './types';

// Update LLM tool signature to be dynamic based on prompt template
export const getLLMToolSignature = (promptTemplate?: string): ToolSignature => {
    if (!promptTemplate) {
        return { parameters: [], outputs: [] };
    }

    const template = PROMPT_TEMPLATES.find(t => t.id === promptTemplate);
    if (!template) {
        return { parameters: [], outputs: [] };
    }

    // Convert prompt output schema to tool output parameters
    const outputParams: ToolParameter[] = template.output.type === 'object' && template.output.schema
        ? Object.entries(template.output.schema.fields).map(([key, field]) => ({
            name: key,
            type: field.type,
            description: field.description || ''
        }))
        : [{
            name: 'response',
            type: template.output.type,
            description: template.output.description
        }];

    return {
        parameters: template.tokens.map(token => ({
            name: token,
            type: 'string',
            description: `Value for {{${token}}} in the prompt`
        })),
        outputs: outputParams
    };
};

export const TOOL_SIGNATURES: Record<Exclude<ToolType, 'llm'>, ToolSignature> & {
    llm: (promptTemplate?: string) => ToolSignature
} = {
    search: {
        parameters: [{
            name: 'query',
            type: 'string',
            description: 'The search query text'
        }],
        outputs: [{
            name: 'results',
            type: 'string[]',
            description: 'List of search results'
        }]
    },
    retrieve: {
        parameters: [{
            name: 'urls',
            type: 'string[]',
            description: 'List of URLs to retrieve content from'
        }],
        outputs: [{
            name: 'contents',
            type: 'string[]',
            description: 'Retrieved content from each URL'
        }]
    },
    llm: getLLMToolSignature
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'question-improver',
        name: 'Question Improver',
        description: 'Improves a research question for better results',
        template: 'Given the question: {{question}}, suggest improvements to make it more specific and answerable. Reply in JSON format with the following fields: improvedQuestion, explanation. Format the JSON as a string.',
        tokens: ['question'],
        output: {
            type: 'object',
            description: 'Improved question with explanation',
            schema: {
                type: 'object',
                fields: {
                    improvedQuestion: {
                        type: 'string',
                        description: 'The improved version of the question'
                    },
                    explanation: {
                        type: 'string',
                        description: 'Explanation of the improvements made'
                    }
                }
            }
        }
    },
    {
        id: 'answer-generator',
        name: 'Answer Generator',
        description: 'Generates comprehensive answers',
        template: 'Based on the context: {{context}}, answer the question: {{question}}',
        tokens: ['context', 'question'],
        output: {
            type: 'string',
            description: 'Comprehensive answer to the question'
        }
    }
];

// Example research workflow with schemas
export const WORKFLOWS: readonly Workflow[] = [
    {
        id: 'research',
        name: 'Research Assistant',
        description: 'AI-powered research workflow to analyze questions and find answers',
        path: '/workflow/research',
        inputs: [
            {
                id: 'research-question',
                name: 'Research Question',
                description: 'The initial research question to investigate',
                schema: {
                    name: 'question',
                    type: 'string'
                }
            }
        ],
        outputs: [
            {
                id: 'improved-question',
                name: 'Improved Question',
                description: 'The improved version of the research question',
                schema: {
                    name: 'improvedQuestion',
                    type: 'object',
                    fields: {
                        question: {
                            name: 'question',
                            type: 'string'
                        },
                        explanation: {
                            name: 'explanation',
                            type: 'string'
                        }
                    }
                }
            },
            {
                id: 'final-answer',
                name: 'Final Answer',
                description: 'The final research answer with citations',
                schema: {
                    name: 'answer',
                    type: 'object',
                    fields: {
                        answer: {
                            name: 'answer',
                            type: 'string'
                        },
                        confidence: {
                            name: 'confidence',
                            type: 'number'
                        },
                        citations: {
                            name: 'citations',
                            type: 'array',
                            items: {
                                name: 'citation',
                                type: 'string'
                            }
                        }
                    }
                }
            }
        ],
        steps: [
            {
                id: 'question-improvement',
                label: 'Question Improvement',
                description: 'Review and approve suggested improvements to your question',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Question Improver',
                    description: 'AI tool to improve research questions',
                    promptTemplate: 'question-improver',
                    parameterMappings: {
                        'question': 'research-question' // Maps to input variable
                    },
                    outputMappings: {
                        'improvedQuestion': 'improved-question' // Maps to output variable
                    }
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
                    description: 'AI tool to generate comprehensive answers',
                    promptTemplate: 'answer-generator',
                    parameterMappings: {
                        'question': 'improved-question.question' // Maps to output from previous step
                    },
                    outputMappings: {
                        'answer': 'final-answer' // Maps to final output variable
                    }
                }
            }
        ]
    },
    {
        id: 'aita',
        name: 'AITA',
        description: 'Find out if you are the asshole',
        path: '/workflow/aita',
        inputs: [
            {
                id: 'story',
                name: 'Your Story',
                description: 'Tell us what happened',
                schema: {
                    name: 'story',
                    type: 'string'
                }
            }
        ],
        outputs: [
            {
                id: 'judgment',
                name: 'Judgment',
                description: 'The final judgment with explanation',
                schema: {
                    name: 'judgment',
                    type: 'object',
                    fields: {
                        verdict: {
                            name: 'verdict',
                            type: 'string'
                        },
                        explanation: {
                            name: 'explanation',
                            type: 'string'
                        }
                    }
                }
            }
        ],
        steps: [
            {
                id: 'analysis',
                label: 'Analysis',
                description: 'AI analysis of your situation',
                stepType: 'ACTION',
                tool: {
                    type: 'llm',
                    name: 'Situation Analyzer',
                    description: 'AI tool to analyze social situations',
                    parameterMappings: {
                        'story': 'story' // Maps to input variable
                    },
                    outputMappings: {
                        'analysis': 'judgment' // Maps to output variable
                    }
                }
            }
        ]
    }
] as const; 