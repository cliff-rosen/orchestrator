// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useState, useEffect } from 'react';
import { Tool } from '../types/tools';
import { WorkflowStep, WorkflowStepType } from '../types/workflows';
import { PromptTemplate } from '../types/prompts';
import { toolApi } from '../lib/api/toolApi';
import { useWorkflows } from '../context/WorkflowContext';
import PromptTemplateSelector from './PromptTemplateSelector';
import ParameterMapper from './ParameterMapper';
import OutputMapper from './OutputMapper';

interface ActionStepEditorProps {
    step: WorkflowStep;
    onStepUpdate: (step: WorkflowStep) => void;
    onDeleteRequest: () => void;
}

// Tool type options
const TOOL_TYPES = [
    { id: 'llm', name: 'LLM', description: 'Language Model tools for text generation and processing', icon: '🤖' },
    { id: 'search', name: 'Search', description: 'Tools for searching and retrieving information', icon: '🔍' },
    { id: 'api', name: 'API', description: 'External API integrations and data processing', icon: '🔌' }
];

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    step,
    onStepUpdate,
    onDeleteRequest
}) => {
    const { workflow } = useWorkflows();
    const [tools, setTools] = useState<Tool[]>([]);
    const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedToolType, setSelectedToolType] = useState<string | null>(
        step.tool?.tool_type || null
    );

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const availableTools = await toolApi.getAvailableTools();
                setTools(availableTools);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching tools:', err);
                setError('Failed to load tools');
                setLoading(false);
            }
        };

        const fetchTemplates = async () => {
            try {
                const templates = await toolApi.getPromptTemplates();
                setPromptTemplates(templates);
            } catch (err) {
                console.error('Error fetching templates:', err);
                setError('Failed to load prompt templates');
            }
        };

        fetchTools();
        fetchTemplates();
    }, []);

    const handleToolSelect = (tool: Tool) => {
        onStepUpdate({
            ...step,
            tool,
            parameter_mappings: {},
            output_mappings: {}
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        if (!step.tool) return;

        const newSignature = await toolApi.createToolSignatureFromTemplate(templateId);
        onStepUpdate({
            ...step,
            tool: {
                ...step.tool,
                signature: newSignature,
            },
            prompt_template: templateId,
            parameter_mappings: {},
            output_mappings: {}
        });
    };

    const handleParameterMappingChange = (mappings: Record<string, string>) => {
        onStepUpdate({
            ...step,
            parameter_mappings: mappings
        });
    };

    const handleOutputMappingChange = (mappings: Record<string, string>) => {
        onStepUpdate({
            ...step,
            output_mappings: mappings
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
        <div className="space-y-8">
            {/* Step 1: Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Step Information
                    </h3>
                    <button
                        onClick={onDeleteRequest}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 
                                 transition-colors duration-200"
                    >
                        Delete Step
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Step Label
                        </label>
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => onStepUpdate({ ...step, label: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="Enter a descriptive label for this step"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={step.description}
                            onChange={(e) => onStepUpdate({ ...step, description: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={2}
                            placeholder="Describe what this step does"
                        />
                    </div>
                </div>
            </div>

            {/* Step 2: Tool Type Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Select Tool Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TOOL_TYPES.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setSelectedToolType(type.id)}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left
                                ${selectedToolType === type.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{type.icon}</span>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        {type.name}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {type.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Tool Selection */}
            {selectedToolType && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Select Tool
                    </h3>
                    <div className="space-y-4">
                        <select
                            value={step.tool?.tool_id || ''}
                            onChange={(e) => {
                                const tool = tools.find(t => t.tool_id === e.target.value);
                                if (tool) handleToolSelect(tool);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Select a tool...</option>
                            {tools
                                .filter(tool => tool.tool_type === selectedToolType)
                                .map(tool => (
                                    <option key={tool.tool_id} value={tool.tool_id}>
                                        {tool.name}
                                    </option>
                                ))}
                        </select>
                        {step.tool && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {step.tool.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4: Prompt Template Selection (for LLM tools) */}
            {step.tool?.tool_type === 'llm' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Select Prompt Template
                    </h3>
                    <PromptTemplateSelector
                        step={step}
                        promptTemplates={promptTemplates}
                        onTemplateChange={handleTemplateChange}
                    />
                </div>
            )}

            {/* Step 5: Parameter and Output Mapping */}
            {step.tool && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        Tool Configuration
                    </h3>

                    {/* Tool Requirements Overview */}
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Tool Requirements
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Required Inputs */}
                            <div>
                                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Required Inputs
                                </h5>
                                <div className="space-y-2">
                                    {step.tool.signature.parameters.map(param => (
                                        <div
                                            key={param.name}
                                            className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 
                                                     border border-blue-200 dark:border-blue-800 rounded-md"
                                        >
                                            <span className="text-sm text-blue-800 dark:text-blue-200">
                                                {param.name}
                                            </span>
                                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                                                ({param.schema.type})
                                            </span>
                                            {param.description && (
                                                <span className="ml-2 text-xs text-blue-500 dark:text-blue-400">
                                                    - {param.description}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Provided Outputs */}
                            <div>
                                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Provided Outputs
                                </h5>
                                <div className="space-y-2">
                                    {step.tool.signature.outputs.map(output => (
                                        <div
                                            key={output.name}
                                            className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 
                                                     border border-green-200 dark:border-green-800 rounded-md"
                                        >
                                            <span className="text-sm text-green-800 dark:text-green-200">
                                                {output.name}
                                            </span>
                                            <span className="ml-2 text-xs text-green-600 dark:text-green-300">
                                                ({output.schema.type})
                                            </span>
                                            {output.description && (
                                                <span className="ml-2 text-xs text-green-500 dark:text-green-400">
                                                    - {output.description}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mapping Section */}
                    <div className="space-y-8">
                        {/* Input Mapping */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                                <span>Input Mapping</span>
                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 
                                               text-blue-800 dark:text-blue-200 rounded-full">
                                    Map tool inputs from workflow variables
                                </span>
                            </h4>
                            <div className="relative">
                                {/* Visual Flow Lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-full bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/10 dark:to-blue-900/10 
                                                  opacity-50 rounded-lg"></div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    {/* Available Variables (Left) */}
                                    <div className="col-span-5 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                            Available Variables
                                        </h5>
                                        <div className="space-y-4">
                                            {/* Workflow Inputs */}
                                            <div>
                                                <h6 className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    Workflow Inputs
                                                </h6>
                                                <div className="flex flex-wrap gap-2">
                                                    {workflow?.inputs?.map(input => (
                                                        <span
                                                            key={input.name}
                                                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 
                                                                     text-blue-800 dark:text-blue-200 rounded-md"
                                                            title={`Type: ${input.schema.type}${input.description ? `\n${input.description}` : ''}`}
                                                        >
                                                            {input.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Previous Outputs */}
                                            <div>
                                                <h6 className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    Previous Outputs
                                                </h6>
                                                <div className="flex flex-wrap gap-2">
                                                    {workflow?.outputs?.map(output => (
                                                        <span
                                                            key={output.name}
                                                            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 
                                                                     text-green-800 dark:text-green-200 rounded-md"
                                                            title={`Type: ${output.schema.type}${output.description ? `\n${output.description}` : ''}`}
                                                        >
                                                            {output.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="col-span-2 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>

                                    {/* Parameter Mapping (Right) */}
                                    <div className="col-span-5 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                            Tool Parameters
                                        </h5>
                                        <div className="space-y-3">
                                            <ParameterMapper
                                                tool={step.tool}
                                                parameter_mappings={step.parameter_mappings || {}}
                                                inputs={workflow?.inputs || []}
                                                outputs={workflow?.outputs || []}
                                                onChange={handleParameterMappingChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Output Mapping */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                                <span>Output Mapping</span>
                                <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 
                                               text-green-800 dark:text-green-200 rounded-full">
                                    Map tool outputs to workflow variables
                                </span>
                            </h4>
                            <div className="relative">
                                {/* Visual Flow Lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-full bg-gradient-to-r from-green-50 to-green-50 dark:from-green-900/10 dark:to-green-900/10 
                                                  opacity-50 rounded-lg"></div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    {/* Tool Outputs (Left) */}
                                    <div className="col-span-5 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                            Tool Outputs
                                        </h5>
                                        <div className="space-y-3">
                                            {step.tool.signature.outputs.map(output => (
                                                <div
                                                    key={output.name}
                                                    className="p-2 bg-green-50 dark:bg-green-900/20 
                                                             border border-green-200 dark:border-green-800 rounded-md"
                                                >
                                                    <div className="text-sm text-green-800 dark:text-green-200">
                                                        {output.name}
                                                    </div>
                                                    <div className="text-xs text-green-600 dark:text-green-400">
                                                        Type: {output.schema.type}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="col-span-2 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>

                                    {/* Output Variable Selection (Right) */}
                                    <div className="col-span-5 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                                            Workflow Outputs
                                        </h5>
                                        <div className="space-y-3">
                                            <OutputMapper
                                                tool={step.tool}
                                                output_mappings={step.output_mappings || {}}
                                                outputs={workflow?.outputs || []}
                                                onChange={handleOutputMappingChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionStepEditor; 