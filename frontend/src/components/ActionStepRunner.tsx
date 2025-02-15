// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React, { useState } from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import { useWorkflows } from '../context/WorkflowContext';
import { fileApi } from '../lib/api/fileApi';
import Dialog from './common/Dialog';
import FileLibrary from './FileLibrary';

interface ActionStepRunnerProps {
    actionStep: RuntimeWorkflowStep;
    isExecuted: boolean;
    isExecuting: boolean;
}

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    isExecuted,
    isExecuting
}) => {
    const { workflow, updateWorkflow } = useWorkflows();
    const [editingInput, setEditingInput] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<any>(null);
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedParam, setSelectedParam] = useState<{ paramName: string, varName: string } | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string>>({});

    // Load file names for file values
    React.useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const [paramName, varName] of Object.entries(actionStep.parameter_mappings || {})) {
                const variable = workflow?.inputs?.find(v => v.name === varName) ||
                    workflow?.outputs?.find(v => v.name === varName);
                if (variable?.schema.type === 'file' && variable.value?.file_id) {
                    try {
                        const fileInfo = await fileApi.getFile(variable.value.file_id);
                        newFileNames[variable.value.file_id] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames);
        };
        loadFileNames();
    }, [workflow, actionStep]);

    // Get input values from workflow variables
    const inputValues: Record<string, any> = {};
    if (actionStep.parameter_mappings) {
        Object.entries(actionStep.parameter_mappings).forEach(([paramName, varName]) => {
            const variable = workflow?.inputs?.find(v => v.name === varName) ||
                workflow?.outputs?.find(v => v.name === varName);
            inputValues[paramName] = {
                value: variable?.value,
                schema: variable?.schema
            };
        });
    }

    // Get output values from workflow variables
    const outputValues: Record<string, any> = {};
    if (actionStep.output_mappings) {
        Object.entries(actionStep.output_mappings).forEach(([outputName, varName]) => {
            const variable = workflow?.outputs?.find(v => v.name === varName);
            outputValues[outputName] = {
                value: variable?.value,
                schema: variable?.schema
            };
        });
    }

    const handleStartEdit = (paramName: string, value: any) => {
        setEditingInput(paramName);
        setEditValue(value === null || value === undefined ? '' : String(value));
    };

    // Set the workflow variable named varName (param) to the value of editValue (stat)
    const handleSaveEdit = (paramName: string, varName: string) => {
        if (!workflow) return;

        // Find and update the variable
        const updatedInputs = [...(workflow.inputs || [])];
        const updatedOutputs = [...(workflow.outputs || [])];

        const inputVar = updatedInputs.find(v => v.name === varName);
        const outputVar = updatedOutputs.find(v => v.name === varName);

        if (inputVar) {
            inputVar.value = editValue;
            updateWorkflow({ inputs: updatedInputs });
        } else if (outputVar) {
            outputVar.value = editValue;
            updateWorkflow({ outputs: updatedOutputs });
        }

        setEditingInput(null);
        setEditValue(null);
    };

    const handleCancelEdit = () => {
        setEditingInput(null);
        setEditValue(null);
    };

    if (!actionStep.tool) {
        return <div className="text-gray-500 dark:text-gray-400">No tool selected</div>;
    }

    // Helper function to format values for display
    const formatValue = (valueObj: { value: any, schema: any }) => {
        if (!valueObj || valueObj.value === undefined || valueObj.value === null) {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        // Handle file values
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

        // For other types, just show the value
        const value = valueObj.value;
        if (Array.isArray(value)) {
            return (
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <div className="p-3">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span className="text-xs">Array ({value.length} items)</span>
                        </div>
                        <div className="space-y-1">
                            {value.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 select-none">{index}</span>
                                    <div className="flex-1 text-gray-700 dark:text-gray-300 text-sm">
                                        {typeof item === 'object' ? (
                                            <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                                        ) : (
                                            <span className="break-all">{String(item)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (typeof value === 'object') {
            return (
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <pre className="p-3 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 text-gray-700 dark:text-gray-300 text-sm break-all">
                    {String(value)}
                </div>
            </div>
        );
    };

    // Helper function to render editable value
    const renderEditableValue = (paramName: string, varName: string, valueObj: { value: any, schema: any }) => {
        if (valueObj.schema?.type === 'file') {
            return (
                <div className="group relative">
                    {formatValue(valueObj)}
                    {!isExecuting && (
                        <button
                            onClick={() => {
                                setSelectedParam({ paramName, varName });
                                setShowFileSelector(true);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-md bg-gray-100 dark:bg-gray-800 
                                     text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 
                                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                            title="Change file"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    )}
                </div>
            );
        }

        if (editingInput === paramName) {
            return (
                <div className="flex flex-col gap-2">
                    {typeof valueObj.value === 'object' ? (
                        <textarea
                            value={typeof editValue === 'object' ? JSON.stringify(editValue, null, 2) : editValue}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    setEditValue(parsed);
                                } catch {
                                    setEditValue(e.target.value);
                                }
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={4}
                        />
                    ) : (
                        <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={editValue ?? ''}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSaveEdit(paramName, varName)}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 
                                     dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 
                                     dark:text-gray-400 dark:hover:text-gray-300 bg-gray-100 hover:bg-gray-200 
                                     dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="group relative">
                {formatValue(value)}
                {!isExecuting && (
                    <button
                        onClick={() => handleStartEdit(paramName, value)}
                        className="absolute top-2 right-2 p-1 rounded-md bg-gray-100 dark:bg-gray-800 
                                 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 
                                 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        title="Edit value"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Stage Indicator */}
            <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${isExecuted ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                        ${isExecuted ? 'border-gray-300 dark:border-gray-600' : 'border-blue-600 dark:border-blue-400'}`}>
                        1
                    </div>
                    <span className="ml-2">Preparation</span>
                </div>
                <div className={`flex-grow h-0.5 ${isExecuted ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                <div className={`flex items-center ${isExecuted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                        ${isExecuted ? 'border-blue-600 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}>
                        2
                    </div>
                    <span className="ml-2">Results</span>
                </div>
            </div>

            {/* Tool Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {actionStep.tool.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {actionStep.tool.description}
                    </p>
                </div>

                {/* Parameters Section */}
                <div className="mt-6 space-y-4">
                    <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Input Parameters</h4>
                        {isExecuting ? (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
                                <span>Executing...</span>
                            </div>
                        ) : !isExecuted ? (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded">
                                Ready to Execute
                            </div>
                        ) : (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded">
                                Executed
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Workflow Variable
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tool Parameter
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {actionStep.parameter_mappings && Object.entries(actionStep.parameter_mappings).map(([paramName, varName]) => (
                                    <tr key={paramName} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                            {varName}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {paramName}
                                        </td>
                                        <td className="px-4 py-2">
                                            {renderEditableValue(paramName, varName, inputValues[paramName])}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Outputs Section */}
                <div className="mt-8 space-y-4">
                    <div className="flex items-center">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Outputs</h4>
                        {isExecuting ? (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
                                <span>Executing...</span>
                            </div>
                        ) : isExecuted && (
                            <div className="ml-2 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded">
                                Execution Complete
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tool Output
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Workflow Variable
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {actionStep.output_mappings && Object.entries(actionStep.output_mappings).map(([outputName, varName]) => (
                                    <tr key={outputName} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                            {outputName}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                            {varName}
                                        </td>
                                        <td className="px-4 py-2">
                                            {formatValue(outputValues[outputName])}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Execution State Description */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {!isExecuted ? (
                    <p>Configure the input parameters above and click Execute to run this step</p>
                ) : (
                    <p>This step has been executed. You can view the results above or proceed to the next step</p>
                )}
            </div>
        </div>
    );
};

export default ActionStepRunner; 