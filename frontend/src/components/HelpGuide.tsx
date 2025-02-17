import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { HelpCircle, X } from 'lucide-react';

const sections = [
    {
        id: 'overview',
        title: 'Overview',
        content: (
            <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300">
                    Orchestrator is a tool that helps you automate research and analysis tasks by combining different tools into reusable workflows. For example, you can:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Search medical literature and automatically summarize key findings</li>
                    <li>Process and analyze documents using AI language models</li>
                    <li>Create templates for consistent AI interactions across multiple documents</li>
                    <li>Save your workflows and reuse them with different inputs</li>
                </ul>
                <p className="mt-4 text-gray-700 dark:text-gray-300">
                    Instead of manually performing these tasks one by one, Orchestrator lets you design a workflow once and run it automatically whenever you need it.
                </p>
            </div>
        )
    },
    {
        id: 'key-concepts',
        title: 'Key Concepts',
        content: (
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
        )
    },
    {
        id: 'getting-started',
        title: 'Getting Started',
        content: (
            <div>
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
            </div>
        )
    },
    {
        id: 'available-tools',
        title: 'Available Tools',
        content: (
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
        )
    },
    {
        id: 'tips',
        title: 'Tips & Tricks',
        content: (
            <ul className="list-disc pl-6 space-y-3 text-gray-700 dark:text-gray-300">
                <li>Use clear names and descriptions for your workflows and steps</li>
                <li>Test your workflow with sample data before running it with real data</li>
                <li>Check the execution results to debug any issues</li>
                <li>Save your workflows regularly while editing</li>
            </ul>
        )
    }
];

export const HelpGuide: React.FC = () => {
    const [activeSection, setActiveSection] = useState('overview');

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
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-700">
                <DialogClose asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4
                                 inline-flex items-center justify-center rounded-md w-8 h-8
                                 text-gray-400 hover:text-gray-500 hover:bg-gray-100
                                 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
                <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">How to Use Orchestrator</DialogTitle>
                </DialogHeader>

                <div className="flex h-[calc(80vh-100px)]">
                    {/* Left Navigation */}
                    <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <nav className="p-4 space-y-1">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
                                              ${activeSection === section.id
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                {sections.find(s => s.id === activeSection)?.title}
                            </h2>
                            {sections.find(s => s.id === activeSection)?.content}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 