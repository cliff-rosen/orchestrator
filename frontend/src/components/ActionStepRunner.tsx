// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React, { useState, useMemo } from 'react';
import { useWorkflows } from '../context/WorkflowContext';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import { fileApi } from '../lib/api/fileApi';
import { WorkflowStep, WorkflowVariableName } from '../types/workflows';
import { isFileValue } from '../types/schema';
import Dialog from './common/Dialog';
import FileLibrary from './FileLibrary';
import PromptTemplateEditor from './PromptTemplateEditor';
import MarkdownRenderer from './common/MarkdownRenderer';
import { WorkflowEngine } from '../lib/workflow/workflowEngine';

interface ActionStepRunnerProps {
    actionStep: WorkflowStep;
    isExecuted: boolean;
    isExecuting: boolean;
}

interface ValueObject {
    value: any;
    schema: any;
}

// Constants for text truncation
const MAX_TEXT_LENGTH = 200;  // Characters for text
const MAX_ARRAY_LENGTH = 3;   // Items for arrays
const MAX_ARRAY_ITEM_LENGTH = 100;  // Characters per array item

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    isExecuted,
    isExecuting
}) => {
    console.log('ActionStepRunner received props:', {
        step_id: actionStep.step_id,
        tool: actionStep.tool,
        parameter_mappings: actionStep.parameter_mappings,
        isExecuted,
        isExecuting
    });

    const { workflow, updateWorkflowByAction } = useWorkflows();
    const { templates } = usePromptTemplates();
    const [editingInput, setEditingInput] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<any>(null);
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedParam, setSelectedParam] = useState<{ paramName: string, varName: string } | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string[]>>({});
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

    // Compute input and output values using WorkflowEngine methods
    const inputValues = useMemo(() =>
        WorkflowEngine.getStepInputValuesForUI(actionStep, workflow),
        [workflow, actionStep]);

    const outputValues = useMemo(() =>
        WorkflowEngine.getStepOutputValuesForUI(actionStep, workflow),
        [workflow, actionStep]);

    // Load file names for file values
    React.useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const [paramName, varName] of Object.entries(actionStep.parameter_mappings || {})) {
                const variable = workflow?.state?.find(v => v.name === varName);
                if (variable?.schema.type === 'file' && variable.value && isFileValue(variable.schema, variable.value)) {
                    try {
                        const fileInfo = await fileApi.getFile(variable.value.file_id);
                        newFileNames[variable.value.file_id] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames as unknown as Record<string, string[]>);
        };
        loadFileNames();
    }, [workflow, actionStep]);

    // Get the current prompt template if this is an LLM tool
    const currentTemplate = React.useMemo(() => {
        if (actionStep.tool?.tool_type === 'llm' && actionStep.prompt_template_id) {
            return templates.find(t => t.template_id === actionStep.prompt_template_id);
        }
        return null;
    }, [actionStep.tool, actionStep.prompt_template_id, templates]);

    const handleStartEdit = (paramName: string, value: any) => {
        setEditingInput(paramName);
        setEditValue(value === null || value === undefined ? '' : String(value));
    };

    const handleSaveEdit = (paramName: string, varName: WorkflowVariableName) => {
        if (!workflow) return;

        const updatedState = (workflow.state || []).map(variable => {
            if (variable.name === varName) {
                return { ...variable, value: editValue };
            }
            return variable;
        });

        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: { state: updatedState }
            }
        });
        setEditingInput(null);
        setEditValue(null);
    };

    const handleCancelEdit = () => {
        setEditingInput(null);
        setEditValue(null);
    };

    const toggleExpand = (id: string) => {
        setExpandedValues(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (!actionStep.tool) {
        return <div className="text-gray-500 dark:text-gray-400">No tool selected</div>;
    }

    // Helper function to format values for display
    const formatValue = (valueObj: ValueObject | undefined, isOutput: boolean = false) => {
        // Add defensive check for undefined/null valueObj
        if (!valueObj) {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        // Add defensive check for undefined/null value or schema
        if (valueObj.value === undefined || valueObj.value === null || !valueObj.schema) {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        // Handle file values with defensive checks
        if (valueObj.schema?.type === 'file') {
            const fileId = valueObj.value?.file_id;
            const fileName = fileNames[fileId] || 'Loading...';

            return (
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{fileName}</span>
                        </div>
                        <div className="flex gap-2">
                            {fileId && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const content = await fileApi.getFileContent(fileId);
                                            // Open in a new window/tab
                                            const win = window.open('', '_blank');
                                            if (win) {
                                                win.document.write(`
                                                    <html>
                                                        <head>
                                                            <title>${fileName} - Content</title>
                                                            <style>
                                                                body { 
                                                                    font-family: monospace;
                                                                    padding: 20px;
                                                                    white-space: pre-wrap;
                                                                    word-wrap: break-word;
                                                                }
                                                            </style>
                                                        </head>
                                                        <body>${content.content}</body>
                                                    </html>
                                                `);
                                            }
                                        } catch (err) {
                                            console.error('Error fetching file content:', err);
                                        }
                                    }}
                                    className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                >
                                    View Content
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Handle array values
        if (Array.isArray(valueObj.value)) {
            // Create a stable ID based on the array content and position
            const id = `array-${valueObj.schema.name}-${JSON.stringify(valueObj.value).slice(0, 50)}`;
            const isExpanded = expandedValues[id];
            const items = valueObj.value;
            const displayItems = isExpanded ? items : items.slice(0, MAX_ARRAY_LENGTH);
            const hasMore = items.length > MAX_ARRAY_LENGTH;

            return (
                <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                    {displayItems.map((item: any, index: number) => {
                        const itemStr = String(item);
                        const truncatedItem = isExpanded ? itemStr :
                            itemStr.length > MAX_ARRAY_ITEM_LENGTH ?
                                `${itemStr.substring(0, MAX_ARRAY_ITEM_LENGTH)}...` : itemStr;

                        return (
                            <div key={index} className="text-sm font-medium text-gray-900 dark:text-white p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                <span className="font-normal text-gray-500 dark:text-gray-400 mr-2">{index + 1}.</span>
                                {truncatedItem}
                            </div>
                        );
                    })}
                    {hasMore && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                     dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                     dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : `Show ${items.length - MAX_ARRAY_LENGTH} More...`}
                        </button>
                    )}
                </div>
            );
        }

        // Handle text values
        const text = String(valueObj.value);
        // Create a stable ID based on the text content and position
        const id = `text-${valueObj.schema.name}-${text.slice(0, 50)}`;
        const isExpanded = expandedValues[id];

        // Use markdown formatting if explicitly requested for output
        // or if the text contains markdown-like characters
        if (isOutput || text.includes('|') || text.includes('#') || text.includes('*')) {
            const displayText = text.length > MAX_TEXT_LENGTH && !isExpanded
                ? `${text.substring(0, MAX_TEXT_LENGTH)}...`
                : text;

            return (
                <div className="space-y-2">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                        <MarkdownRenderer content={displayText} />
                    </div>
                    <button
                        onClick={() => toggleExpand(id)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                    >
                        {isExpanded ? 'Show Less' : 'Show More...'}
                    </button>
                </div>
            );
        }

        // For regular text without markdown
        if (text.length <= MAX_TEXT_LENGTH) {
            return (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-base text-gray-900 dark:text-white whitespace-pre-wrap font-normal">
                        {text}
                    </div>
                </div>
            );
        }

        const truncatedText = isExpanded ? text : `${text.substring(0, MAX_TEXT_LENGTH)}...`;

        return (
            <div className="space-y-2">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-base text-gray-900 dark:text-white whitespace-pre-wrap font-normal">
                        {truncatedText}
                    </div>
                </div>
                <button
                    onClick={() => toggleExpand(id)}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    {isExpanded ? 'Show Less' : 'Show More...'}
                </button>
            </div>
        );
    };

    // Helper function to render editable value
    const renderEditableValue = (paramName: string, varName: string, valueObj: ValueObject | undefined) => {
        if (editingInput === paramName) {
            return (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        autoFocus
                    />
                    <button
                        onClick={() => handleSaveEdit(paramName, varName as WorkflowVariableName)}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 
                                 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 
                                 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-md transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 
                                 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-50 hover:bg-gray-100 
                                 dark:bg-gray-900/20 dark:hover:bg-gray-900/30 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        const value = valueObj?.value;
        const formattedValue = formatValue(valueObj);
        const isComplexValue = React.isValidElement(formattedValue);

        return (
            <div className="flex items-center gap-2">
                {isComplexValue ? (
                    <div className="flex-1 min-w-0">{formattedValue}</div>
                ) : (
                    <div className="flex-1 min-w-0 text-gray-900 dark:text-gray-100">
                        {formattedValue}
                    </div>
                )}
                <button
                    onClick={() => handleStartEdit(paramName, value)}
                    className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    Edit
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Tool Information */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {actionStep.tool.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {actionStep.tool.description}
                </p>
            </div>

            {/* Prompt Template Section (for LLM tools) */}
            {actionStep.tool.tool_type === 'llm' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Prompt Template
                        </h4>
                        {!isExecuted && (
                            <button
                                onClick={() => setShowTemplateEditor(true)}
                                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                                         dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                         dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            >
                                Edit Template
                            </button>
                        )}
                    </div>
                    {currentTemplate ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {currentTemplate.system_message_template}
                                {currentTemplate.user_message_template}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            No prompt template selected
                        </div>
                    )}
                </div>
            )}

            {/* Input Parameters */}
            <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Input Parameters
                </h4>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Parameter
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {actionStep.tool.signature.parameters.map(param => {
                                const paramName = param.name;
                                const varName = actionStep.parameter_mappings?.[paramName] || '';
                                return (
                                    <tr key={paramName}>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {paramName}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {param.schema.description}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {param.schema.type === 'file' ? (
                                                <div className="flex items-center gap-2">
                                                    {formatValue(inputValues[paramName])}
                                                    {!isExecuted && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedParam({ paramName, varName });
                                                                setShowFileSelector(true);
                                                            }}
                                                            className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                                                     dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                                                     dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                        >
                                                            Select File
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                renderEditableValue(paramName, varName, inputValues[paramName])
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Output Values */}
            {isExecuted && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                        Output Values
                    </h4>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Output
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {actionStep.tool.signature.outputs.map(output => {
                                    const outputName = output.name;
                                    return (
                                        <tr key={outputName}>
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {outputName}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {output.schema.description}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                {formatValue(outputValues[outputName], true)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* File Selector Dialog */}
            {showFileSelector && selectedParam && (
                <Dialog
                    title="Select File"
                    onClose={() => {
                        setShowFileSelector(false);
                        setSelectedParam(null);
                    }}
                    isOpen={showFileSelector}
                >
                    <FileLibrary
                        onFileSelect={(fileId: string) => {
                            if (!workflow || !selectedParam) return;

                            const updatedState = (workflow.state || []).map(variable => {
                                if (variable.name === selectedParam.varName) {
                                    return { ...variable, value: { file_id: fileId } };
                                }
                                return variable;
                            });

                            updateWorkflowByAction({
                                type: 'UPDATE_WORKFLOW',
                                payload: {
                                    workflowUpdates: { state: updatedState }
                                }
                            });
                            setShowFileSelector(false);
                            setSelectedParam(null);
                        }}
                    />
                </Dialog>
            )}

            {/* Template Editor Dialog */}
            {showTemplateEditor && (
                <Dialog
                    title="Edit Prompt Template"
                    onClose={() => setShowTemplateEditor(false)}
                    isOpen={showTemplateEditor}
                >
                    <PromptTemplateEditor
                        template={currentTemplate || null}
                        onTemplateChange={(templateId: string) => {
                            if (!workflow) return;

                            // Update the step with the new template using the action-based approach
                            updateWorkflowByAction({
                                type: 'UPDATE_STEP',
                                payload: {
                                    stepId: actionStep.step_id,
                                    step: {
                                        ...actionStep,
                                        prompt_template_id: templateId
                                    }
                                }
                            });
                            setShowTemplateEditor(false);
                        }}
                        onClose={() => setShowTemplateEditor(false)}
                    />
                </Dialog>
            )}
        </div>
    );
};

export default ActionStepRunner; 