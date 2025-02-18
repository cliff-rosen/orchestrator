import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import { PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { JobStatus, JobVariable } from '../types/jobs';

const Job: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { currentJob, loadJob, startJob, cancelJob, resetCurrentJob, createJob } = useJobs();
    const { workflows } = useWorkflows();
    const [inputValues, setInputValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const workflow = workflows?.find(w => w.workflow_id === currentJob?.workflow_id);
    const workflowInputs = workflow?.inputs || [];

    // Determine if we need inputs based on job status and workflow inputs
    const needsInput = currentJob?.status === JobStatus.PENDING && workflowInputs.length > 0;

    console.log('Job.tsx', {
        jobId,
        currentJob,
        status: currentJob?.status,
        needsInput,
        workflowInputs
    });

    // Load job data
    useEffect(() => {
        if (jobId) {
            loadJob(jobId);
        }
        return () => {
            resetCurrentJob();
        };
    }, [jobId, loadJob, resetCurrentJob]);

    // Initialize input values when workflow inputs change
    useEffect(() => {
        console.log('Initializing input values:', { workflow, workflowInputs });

        if (workflow && workflow.inputs && needsInput) {
            const initialValues: Record<string, any> = {};
            workflow.inputs.forEach(input => {
                // Initialize with empty string for text/number, false for boolean
                initialValues[input.variable_id] = input.schema.type === 'boolean' ? false : '';
                console.log(`Initializing input ${input.variable_id} with type ${input.schema.type}`);
            });
            console.log('Setting input values:', initialValues);
            setInputValues(initialValues);

            // Clear any existing errors when inputs change
            setErrors({});
        }
    }, [workflow, needsInput]); // Added needsInput to dependencies

    // Early return for loading state
    if (!currentJob || !workflow) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading job...</p>
                </div>
            </div>
        );
    }

    // Debug logging
    console.log('Job render:', {
        needsInput,
        workflowInputs,
        inputValues,
        currentJob,
        workflow
    });

    // Add this near the other debug logging
    console.log('Job controls:', {
        status: currentJob?.status,
        isRunning: currentJob?.status === JobStatus.RUNNING,
        JobStatus: JobStatus
    });

    const validateInputs = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        workflowInputs.forEach(input => {
            const value = inputValues[input.variable_id];
            if (!value && input.schema.type !== 'boolean') {
                newErrors[input.variable_id] = 'This field is required';
                isValid = false;
            }
            // Add more validation based on schema type if needed
        });

        setErrors(newErrors);
        return isValid;
    };

    const areInputsValid = () => {
        if (!workflowInputs || workflowInputs.length === 0) return false;

        return workflowInputs.every(input => {
            const value = inputValues[input.variable_id];
            // Boolean inputs are always valid (they default to false)
            if (input.schema.type === 'boolean') return true;
            // File inputs need a File object
            if (input.schema.type === 'file') return value instanceof File;
            // For other types, check if we have a non-empty value
            return value !== undefined && value !== '';
        });
    };

    const handleInputChange = (variableId: string, value: any) => {
        setInputValues(prev => ({
            ...prev,
            [variableId]: value
        }));

        // Clear error when user starts typing
        if (errors[variableId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[variableId];
                return newErrors;
            });
        }

        // Validate the field in real-time
        const input = workflowInputs.find(i => i.variable_id === variableId);
        if (input && input.schema.type !== 'boolean' && (!value || value === '')) {
            setErrors(prev => ({
                ...prev,
                [variableId]: 'This field is required'
            }));
        }
    };

    const handleStart = async () => {
        console.log('handleStart', { needsInput, validateInputs });
        if (needsInput) {
            if (!validateInputs()) return;

            // Convert input values to JobVariables
            const jobVariables: JobVariable[] = await Promise.all(workflowInputs.map(async input => {
                let value = inputValues[input.variable_id];

                // If it's a file input, we need to convert the File to base64
                if (input.schema.type === 'file' && value instanceof File) {
                    value = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            // Get just the base64 part of the result
                            const base64 = reader.result?.toString().split(',')[1];
                            resolve({
                                name: value.name,
                                type: value.type,
                                size: value.size,
                                content: base64
                            });
                        };
                        reader.readAsDataURL(value);
                    });
                }

                return {
                    variable_id: input.variable_id,
                    schema: input.schema,
                    value: value,
                    required: true
                };
            }));

            try {
                await startJob(currentJob.job_id, jobVariables);
                // Remove input mode from URL and continue to job execution
                navigate(`/jobs/${currentJob.job_id}`);
            } catch (error) {
                console.error('Failed to start job:', error);
            }
        } else {
            try {
                await startJob(currentJob.job_id);
            } catch (error) {
                console.error('Failed to start job:', error);
            }
        }
    };

    const handleCancel = async () => {
        try {
            await cancelJob(currentJob.job_id);
        } catch (error) {
            console.error('Failed to cancel job:', error);
        }
    };

    const handleRestart = async () => {
        try {
            // Create a new job with the same workflow
            const newJob = await createJob({
                workflow_id: currentJob.workflow_id,
                name: `${workflow.name || 'Untitled Workflow'} (Restarted)`,
                description: currentJob.description,
                input_variables: []  // Will be populated in the input form
            });
            // Navigate to the new job
            navigate(`/jobs/${newJob.job_id}`);
        } catch (error) {
            console.error('Failed to restart job:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Navigation Bar */}
            <div className="mb-6 flex justify-between items-center">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/jobs')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </Button>

                {/* Job Controls */}
                <div className="flex gap-3">
                    {currentJob.status === JobStatus.PENDING && (
                        <Button
                            onClick={handleStart}
                            disabled={needsInput && !areInputsValid()}
                            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors
                                ${needsInput && !areInputsValid()
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'}`}
                        >
                            <PlayCircle className="h-4 w-4 mr-1.5" />
                            Start Job
                        </Button>
                    )}
                    {currentJob.status === JobStatus.RUNNING && (
                        <Button
                            onClick={handleCancel}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium
                                     bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                        >
                            <StopCircle className="h-4 w-4 mr-1.5" />
                            Cancel
                        </Button>
                    )}
                    {(currentJob.status === JobStatus.COMPLETED || currentJob.status === JobStatus.FAILED) && (
                        <Button
                            onClick={handleRestart}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium
                                     bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            <PlayCircle className="h-4 w-4 mr-1.5" />
                            Restart
                        </Button>
                    )}
                </div>
            </div>

            {/* Job Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
                    {currentJob.name}
                </h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">Workflow:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-50">{workflow.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className={`inline-flex items-center gap-2 ${currentJob.status === JobStatus.RUNNING ? 'text-blue-500 dark:text-blue-400' :
                            currentJob.status === JobStatus.COMPLETED ? 'text-green-500 dark:text-green-400' :
                                currentJob.status === JobStatus.FAILED ? 'text-red-500 dark:text-red-400' :
                                    'text-gray-500 dark:text-gray-400'
                            }`}>
                            <span className={`h-2 w-2 rounded-full ${currentJob.status === JobStatus.RUNNING ? 'bg-blue-500 animate-pulse' :
                                currentJob.status === JobStatus.COMPLETED ? 'bg-green-500' :
                                    currentJob.status === JobStatus.FAILED ? 'bg-red-500' :
                                        'bg-gray-500'
                                }`} />
                            {currentJob.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* Steps List - Left Side */}
                <div className="col-span-4 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Workflow Steps</h2>
                    {workflow.steps.map((step, index) => (
                        <div
                            key={step.step_id}
                            className={`p-4 rounded-lg border ${needsInput && index === 0
                                ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20'
                                : currentJob.execution_progress?.current_step === index
                                    ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20'
                                    : index < (currentJob.execution_progress?.current_step || 0)
                                        ? 'border-green-500 bg-green-50/10 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${needsInput && index === 0
                                    ? 'bg-blue-500 text-white'
                                    : currentJob.execution_progress?.current_step === index
                                        ? 'bg-blue-500 text-white'
                                        : index < (currentJob.execution_progress?.current_step || 0)
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-gray-50">
                                        {step.label || `Step ${index + 1}`}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {step.description}
                                    </p>
                                    {step.tool && (
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Tool: {step.tool.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Execution Details - Right Side */}
                <div className="col-span-8 space-y-6">
                    {needsInput ? (
                        // Input Form
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-4">
                                Configure Job Inputs
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Please provide the required inputs to start this job.
                            </p>
                            <div className="space-y-6">
                                {workflowInputs.map(input => (
                                    <div key={input.variable_id} className="space-y-2">
                                        <label
                                            htmlFor={input.variable_id}
                                            className="block text-sm font-medium text-gray-900 dark:text-gray-50"
                                        >
                                            {input.schema.name}
                                            <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                                        </label>
                                        {input.schema.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {input.schema.description}
                                            </p>
                                        )}
                                        {input.schema.type === 'boolean' ? (
                                            <div className="flex items-center">
                                                <input
                                                    id={input.variable_id}
                                                    type="checkbox"
                                                    checked={!!inputValues[input.variable_id]}
                                                    onChange={(e) => handleInputChange(input.variable_id, e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label
                                                    htmlFor={input.variable_id}
                                                    className="ml-2 text-sm text-gray-900 dark:text-gray-50"
                                                >
                                                    Enable
                                                </label>
                                            </div>
                                        ) : input.schema.type === 'file' ? (
                                            <div className="flex items-center">
                                                <input
                                                    id={input.variable_id}
                                                    type="file"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleInputChange(input.variable_id, file);
                                                        }
                                                    }}
                                                    className={`block w-full text-sm
                                                        file:mr-4 file:py-2 file:px-4
                                                        file:rounded-md file:border-0
                                                        file:text-sm file:font-semibold
                                                        file:bg-blue-50 file:text-blue-700
                                                        hover:file:bg-blue-100
                                                        dark:file:bg-blue-900/20 dark:file:text-blue-300
                                                        dark:hover:file:bg-blue-900/30
                                                        ${errors[input.variable_id]
                                                            ? 'text-red-500 dark:text-red-400'
                                                            : 'text-gray-900 dark:text-gray-50'
                                                        }`}
                                                />
                                                {inputValues[input.variable_id] && (
                                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                        {inputValues[input.variable_id].name}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                id={input.variable_id}
                                                type={input.schema.type === 'number' ? 'number' : 'text'}
                                                value={inputValues[input.variable_id] || ''}
                                                onChange={(e) => handleInputChange(input.variable_id, e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800
                                                          ${errors[input.variable_id]
                                                        ? 'border-red-500 dark:border-red-400'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                    } text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500`}
                                            />
                                        )}
                                        {errors[input.variable_id] && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {errors[input.variable_id]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Progress Bar */}
                            {currentJob.execution_progress && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-4">
                                        Execution Progress
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>
                                                Step {currentJob.execution_progress.current_step + 1} of {currentJob.execution_progress.total_steps}
                                            </span>
                                            <span>
                                                {Math.round((currentJob.execution_progress.current_step / currentJob.execution_progress.total_steps) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(currentJob.execution_progress.current_step / currentJob.execution_progress.total_steps) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Current Step Details */}
                            {currentJob.steps[currentJob.execution_progress?.current_step || 0] && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-4">
                                        Current Step Details
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Step Input Parameters */}
                                        <div>
                                            <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                Input Parameters
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                {Object.entries(currentJob.steps[currentJob.execution_progress?.current_step || 0].parameter_mappings).map(([key, value]) => (
                                                    <div key={key} className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{key}</div>
                                                        <div className="text-sm truncate text-gray-900 dark:text-gray-50">{value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Step Output (if completed) */}
                                        {currentJob.steps[currentJob.execution_progress?.current_step || 0].output_data && (
                                            <div>
                                                <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Output</h4>
                                                <pre className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-sm overflow-auto text-gray-900 dark:text-gray-50">
                                                    {JSON.stringify(currentJob.steps[currentJob.execution_progress?.current_step || 0].output_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Live Output */}
                            {currentJob.live_output && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-4">Live Output</h3>
                                    <pre className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-sm overflow-auto max-h-96 text-gray-900 dark:text-gray-50">
                                        {currentJob.live_output}
                                    </pre>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Job; 