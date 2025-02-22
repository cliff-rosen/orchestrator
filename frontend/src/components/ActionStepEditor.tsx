// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useEffect, useState } from 'react';
import { WorkflowStep, WorkflowStepType } from '../types/workflows';
import { Tool } from '../types/tools';
import { toolApi } from '../lib/api/toolApi';
import EvaluationStepEditor from './EvaluationStepEditor';
import ToolActionEditor from './ToolActionEditor';

interface ActionStepEditorProps {
    step: WorkflowStep;
    onStepUpdate: (step: WorkflowStep) => void;
    onDeleteRequest: () => void;
}

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    step,
    onStepUpdate,
    onDeleteRequest
}) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTools = async () => {
            try {
                setLoading(true);
                const availableTools = await toolApi.getTools();
                setTools(availableTools);
            } catch (err) {
                console.error('Error loading tools:', err);
                setError('Failed to load tools');
            } finally {
                setLoading(false);
            }
        };
        loadTools();
    }, []);

    const handleStepTypeChange = () => {
        onStepUpdate({
            ...step,
            step_type: step.step_type === WorkflowStepType.ACTION ? WorkflowStepType.EVALUATION : WorkflowStepType.ACTION,
            // Clear tool-specific data when switching to evaluation
            ...(step.step_type === WorkflowStepType.ACTION ? {
                tool: undefined,
                tool_id: undefined,
                parameter_mappings: {},
                output_mappings: {},
                prompt_template_id: undefined,
                evaluation_config: {
                    conditions: [],
                    default_action: 'continue'
                }
            } : {})
        });
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-4">{error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Step 1: Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Step Label
                        </label>
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => onStepUpdate({ ...step, label: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="Enter a descriptive label for this step"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={step.description}
                            onChange={(e) => onStepUpdate({ ...step, description: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={1}
                            placeholder="Describe what this step does"
                        />
                    </div>
                </div>

                {/* Subtle type switcher */}
                <div className="mt-4 flex items-center justify-end">
                    <button
                        onClick={handleStepTypeChange}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2"
                    >
                        <span>Switch to {step.step_type === WorkflowStepType.ACTION ? 'Evaluation' : 'Action'} Step</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Step Configuration */}
            {step.step_type === WorkflowStepType.ACTION ? (
                <ToolActionEditor
                    step={step}
                    tools={tools}
                    onStepUpdate={onStepUpdate}
                />
            ) : (
                <EvaluationStepEditor
                    step={step}
                    onStepUpdate={onStepUpdate}
                />
            )}
        </div>
    );
};

export default ActionStepEditor; 