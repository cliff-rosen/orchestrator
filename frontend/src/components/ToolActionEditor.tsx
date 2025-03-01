import React, { useEffect, useState } from 'react';
import { WorkflowStep, WorkflowVariableName, WorkflowVariable, Workflow, addWorkflowVariable, getWorkflowInputs, getWorkflowOutputs } from '../types/workflows';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { toolApi } from '../lib/api/toolApi';
import PromptTemplateSelector from './PromptTemplateSelector';
import DataFlowMapper2 from './DataFlowMapper2';
import { useWorkflows } from '../context/WorkflowContext';
import ToolSelector from './ToolSelector';

interface ToolActionEditorProps {
    step: WorkflowStep;
    tools: Tool[];
    onStepUpdate: (step: WorkflowStep) => void;
}

const ToolActionEditor: React.FC<ToolActionEditorProps> = ({
    step,
    tools,
    onStepUpdate
}) => {
    const { workflow, updateWorkflow, updateWorkflowByAction } = useWorkflows();

    const handleToolSelect = (tool: Tool | undefined) => {
        console.log('handleToolSelect', tool);

        updateWorkflowByAction({
            type: 'UPDATE_STEP_TOOL',
            payload: {
                stepId: step.step_id,
                tool
            }
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        console.log('handleTemplateChange', templateId);
        if (!step.tool) return;

        try {
            const updatedStep = await toolApi.updateWorkflowStepWithTemplate(step, templateId);
            onStepUpdate(updatedStep);
        } catch (err) {
            console.error('Error updating step with template:', err);
        }
    };

    const handleParameterMappingChange = (parameterMappings: Record<ToolParameterName, WorkflowVariableName>) => {
        updateWorkflowByAction({
            type: 'UPDATE_PARAMETER_MAPPINGS',
            payload: {
                stepId: step.step_id,
                mappings: parameterMappings
            }
        });
    };

    const handleOutputMappingChange = (outputMappings: Record<ToolOutputName, WorkflowVariableName>) => {
        updateWorkflowByAction({
            type: 'UPDATE_OUTPUT_MAPPINGS',
            payload: {
                stepId: step.step_id,
                mappings: outputMappings
            }
        });
    };

    const handleAddVariable = (newVariable: WorkflowVariable) => {
        if (!workflow) return;

        const updatedWorkflow = addWorkflowVariable(workflow, newVariable);
        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: { state: updatedWorkflow.state }
            }
        });
    };

    return (
        <>
            {/* Tool Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <ToolSelector
                    tools={tools}
                    selectedTool={step.tool}
                    onSelect={handleToolSelect}
                />
            </div>

            {/* Prompt Template Selection (for LLM tools) */}
            {step.tool?.tool_type === 'llm' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Select Prompt Template
                    </h3>
                    <PromptTemplateSelector
                        step={step}
                        onTemplateChange={handleTemplateChange}
                    />
                </div>
            )}

            {/* Parameter and Output Mapping */}
            {(step.tool && (step.tool.tool_type !== 'llm' || step.prompt_template_id)) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Data Flow Configuration
                    </h3>
                    <DataFlowMapper2
                        tool={step.tool}
                        parameter_mappings={step.parameter_mappings || {}}
                        output_mappings={step.output_mappings || {}}
                        inputs={workflow ? getWorkflowInputs(workflow) : []}
                        outputs={workflow ? getWorkflowOutputs(workflow) : []}
                        onParameterMappingChange={handleParameterMappingChange}
                        onOutputMappingChange={handleOutputMappingChange}
                        onVariableCreate={handleAddVariable}
                    />
                </div>
            )}
        </>
    );
};

export default ToolActionEditor; 