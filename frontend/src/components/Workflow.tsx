import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowStep as BaseWorkflowStep, Workflow as WorkflowType, Schema } from '../data';

interface RuntimeWorkflowStep extends BaseWorkflowStep {
    action: (data?: any) => Promise<void>;
    component: (props: any) => JSX.Element;
    actionButtonText: (state?: any) => string;
    isDisabled?: (state?: any) => boolean;
}

interface WorkflowProps {
    workflows: readonly WorkflowType[];
}

interface WorkflowState {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
}

const Workflow: React.FC<WorkflowProps> = ({ workflows }) => {
    const navigate = useNavigate();
    const { workflowId } = useParams();
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [_isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string>('');
    const [isEditMode, setIsEditMode] = useState(true);
    const [state, setState] = useState<WorkflowState>({
        inputs: {},
        outputs: {}
    });

    // Find the selected workflow
    const workflow = workflows.find(w => w.id === workflowId);

    // Redirect to home if workflow not found
    useEffect(() => {
        if (!workflow) {
            navigate('/');
        }
    }, [workflow, navigate]);

    if (!workflow) {
        return null;
    }

    const handleNext = async (): Promise<void> => {
        setIsLoading(true);
        // delay for 1 second
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsLoading(false);
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = async (): Promise<void> => {
        setActiveStep((prev) => prev - 1);
    };

    const handleNewQuestion = async (): Promise<void> => {
        setActiveStep(0);
        setState({ inputs: {}, outputs: {} });
    };

    const renderStepContent = (step: number) => {
        const currentStep = workflowSteps[step];
        return (
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{currentStep.label}</h2>
                <div className="mb-4">
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Tool: {currentStep.tool.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{currentStep.tool.description}</p>
                </div>
                <div className="mb-4">
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Input Schema:</h3>
                    <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        {JSON.stringify(currentStep.inputSchema, null, 2)}
                    </pre>
                </div>
                <div>
                    <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Output Schema:</h3>
                    <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        {JSON.stringify(currentStep.outputSchema, null, 2)}
                    </pre>
                </div>
            </div>
        );
    };

    // Convert workflow steps to RuntimeWorkflowStep interface
    const workflowSteps: RuntimeWorkflowStep[] = [
        // Input step for workflow configuration
        {
            label: 'Input',
            description: 'Configure workflow inputs',
            tool: {
                name: 'workflow_input',
                description: 'Configure the workflow inputs'
            },
            inputSchema: {
                fields: []
            },
            outputSchema: {
                fields: []
            },
            action: handleNext,
            actionButtonText: () => 'Save Inputs',
            component: () => <div>Configure Workflow Inputs</div>
        },
        // Regular workflow steps
        ...workflow.steps.map(step => ({
            ...step,
            action: handleNext,
            actionButtonText: () => 'Next Step',
            component: () => <div>{step.label}</div>
        }))
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Menu Bar */}
            <div className="bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        {/* Back to Workflows Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Workflows
                        </button>
                        <span className="text-gray-600 dark:text-gray-300">
                            {workflow.name}
                        </span>
                    </div>

                    {/* Mode Toggle Button */}
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 
                                 transition-colors flex items-center space-x-2"
                    >
                        {isEditMode ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Run Workflow</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit Workflow</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content Area with Left Nav */}
            <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                {/* Left Navigation */}
                <div className="w-64 shrink-0 p-6 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                    <div className="flex flex-col gap-4">
                        {workflowSteps.map((step, index) => (
                            <div
                                key={step.label}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${index === activeStep
                                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-200'
                                    : index < activeStep
                                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-200'
                                        : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === activeStep
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                                    : index < activeStep
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex flex-col">
                                    <div className="font-medium">{step.label}</div>
                                    <div className="text-xs opacity-80">{step.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-lg p-6">
                        {renderStepContent(activeStep)}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <button
                                className={`px-4 py-2 rounded-lg ${activeStep === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
                                    }`}
                                onClick={handleBack}
                                disabled={activeStep === 0}
                            >
                                Back
                            </button>
                            {activeStep > 0 && (
                                <button
                                    onClick={handleNewQuestion}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <span>New Question</span>
                                </button>
                            )}
                        </div>

                        {/* Workflow-specific action button */}
                        {activeStep < workflowSteps.length - 1 && (
                            <button
                                onClick={() => workflowSteps[activeStep].action()}
                                disabled={isLoading || (workflowSteps[activeStep].isDisabled?.() ?? false)}
                                className={`px-6 py-2 rounded-lg ${isLoading || (workflowSteps[activeStep].isDisabled?.() ?? false)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {isLoading ? 'Processing...' : workflowSteps[activeStep].actionButtonText()}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workflow; 