import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { HelpCircle } from 'lucide-react';

export const HelpGuide: React.FC = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="inline-flex items-center justify-center rounded-md w-8 h-8
                             text-gray-400 hover:text-gray-500 hover:bg-gray-100
                             dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                             transition-colors"
                    aria-label="Help"
                >
                    <HelpCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-700">
                <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">How to Use Orchestrator</DialogTitle>
                </DialogHeader>

                <div className="space-y-8 py-6">
                    <section>
                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Key Concepts</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Workflows</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Workflows are series of steps that involve taking actions through tools. You can design and author workflows
                                    to define how different tools work together to accomplish your goals.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Prompt Templates</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    When using Language Models (LLMs) as tools, prompt templates let you customize how these models behave.
                                    Create and manage templates to ensure consistent and effective interactions with LLMs.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Files</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    The app manages files that can be used to populate prompt templates and provide data for your workflows.
                                    Files serve as reusable resources across your workflow steps.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Jobs</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Jobs are where you put workflows into action. Select a workflow, configure input sources and output destinations,
                                    and let the job automatically process all inputs through your workflow. Jobs help you operationalize your
                                    workflow designs at scale.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Getting Started</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-4 text-base">
                            Orchestrator helps you create, manage, and execute workflows. Here's how to get started:
                        </p>
                        <ol className="list-decimal pl-6 space-y-3 text-gray-700 dark:text-gray-300">
                            <li><strong>Design Your Workflow:</strong>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li>Create a new workflow in the Workflows section</li>
                                    <li>Add and configure steps using available tools</li>
                                    <li>Set up connections between steps</li>
                                    <li>Save your workflow design</li>
                                </ul>
                            </li>
                            <li><strong>Run Your Workflow:</strong>
                                <ul className="list-disc pl-6 mt-2 space-y-2">
                                    <li>Go to the Jobs section</li>
                                    <li>Select your workflow</li>
                                    <li>Configure input sources and output destinations</li>
                                    <li>Start the job and monitor its progress</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Available Tools</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">PubMed Search</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Search medical literature using PubMed. Enter your search query and get relevant research papers.
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">LLM Integration</h4>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Use language models with custom prompts to process and analyze text.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Managing Workflows</h3>
                        <ul className="list-disc pl-6 space-y-3 text-gray-700 dark:text-gray-300">
                            <li>View all your workflows in the Workflows Manager</li>
                            <li>Edit workflows by clicking on them</li>
                            <li>Delete workflows using the delete button</li>
                            <li>Track workflow status and execution results</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Tips & Tricks</h3>
                        <ul className="list-disc pl-6 space-y-3 text-gray-700 dark:text-gray-300">
                            <li>Use clear names and descriptions for your workflows and steps</li>
                            <li>Test your workflow with sample data before running it with real data</li>
                            <li>Check the execution results to debug any issues</li>
                            <li>Save your workflows regularly while editing</li>
                        </ul>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 