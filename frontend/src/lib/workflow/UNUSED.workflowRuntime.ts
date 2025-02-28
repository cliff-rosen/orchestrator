import {
    WorkflowStep,
    WorkflowVariable,
    StepExecutionResult,
    WorkflowVariableName
} from '../../types/workflows';
import { ToolParameterName } from '../../types/tools';

/**
 * Utility functions for workflow runtime operations
 * These replace the functions previously embedded in RuntimeWorkflowStep
 */

/**
 * Executes a workflow step
 */
export const executeStep = (
    step: WorkflowStep,
    index: number,
    activeStep: number,
    executeCurrentStep: () => Promise<StepExecutionResult>
): Promise<StepExecutionResult> => {
    if (index === activeStep) {
        return executeCurrentStep();
    }
    return Promise.resolve({
        success: false,
        error: 'Step is not active'
    });
};

/**
 * Gets the text to display on the action button for a step
 */
export const getActionButtonText = (
    step: WorkflowStep,
    index: number,
    activeStep: number,
    stepExecuted: boolean
): string => {
    if (index === activeStep) {
        return stepExecuted ? 'Next Step' : 'Execute Tool';
    }
    return 'Execute Tool';
};

/**
 * Checks if a step is disabled
 */
export const isStepDisabled = (
    step: WorkflowStep,
    index: number,
    activeStep: number,
    isExecuting: boolean
): boolean => {
    return index !== activeStep || isExecuting;
};

/**
 * Gets validation errors for a step
 */
export const getStepValidationErrors = (
    step: WorkflowStep,
    workflowState: WorkflowVariable[] = []
): string[] => {
    const errors: string[] = [];

    if (!step.tool) {
        errors.push('No tool selected');
    }

    if (step.tool?.tool_type === 'llm' && !step.prompt_template_id) {
        errors.push('No prompt template selected');
    }

    // Check parameter mappings
    if (step.parameter_mappings) {
        for (const [paramName, varName] of Object.entries(step.parameter_mappings)) {
            // Look for the variable in the workflow state, filtering by io_type
            const inputVars = workflowState.filter(v => v.io_type === 'input') || [];
            const outputVars = workflowState.filter(v => v.io_type === 'output') || [];

            const variable = inputVars.find(v => v.name === varName) ||
                outputVars.find(v => v.name === varName);

            if (!variable) {
                errors.push(`Missing variable mapping for parameter: ${paramName}`);
            }
        }
    }

    return errors;
}; 