import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import { PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { JobStatus, JobVariable } from '../types/jobs';
import { ValueType } from '../types/schema';

const Job: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentJob, loadJob, startJob, cancelJob, resetCurrentJob } = useJobs();
    const { workflows } = useWorkflows();
    const [inputValues, setInputValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isInputMode = searchParams.get('mode') === 'inputs';
    const workflow = workflows?.find(w => w.workflow_id === currentJob?.workflow_id);
    const workflowInputs = workflow?.inputs || [];

    console.log('Job.tsx', jobId, currentJob);

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

        if (workflow && workflow.inputs) {
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
    }, [workflow]); // Changed dependency to workflow since that's the source of inputs

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
        isInputMode,
        workflowInputs,
        inputValues,
        currentJob,
        workflow
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

    const mapSchemaTypeToJobType = (schemaType: ValueType): JobVariable['type'] => {
        switch (schemaType) {
            case 'number':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'file':
            case 'string':
                return 'string';
            default:
                return 'string';
        }
    };

    const handleStart = async () => {
        if (isInputMode) {
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
                    name: input.schema.name,
                    label: input.schema.description,
                    description: input.schema.description,
                    value: value,
                    type: mapSchemaTypeToJobType(input.schema.type),
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

    if (isInputMode) {
        return (
            <div className="container mx-auto px-4 py-8">
                {/* Navigation */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/jobs')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Jobs
                    </Button>
                </div>

                {/* Job Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Configure Job: {currentJob.name}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please provide the required inputs to start this job.
                    </p>
                </div>

                {/* Input Form */}
                <div className="space-y-6 max-w-2xl">
                    {workflowInputs.map(input => (
                        <div key={input.variable_id} className="space-y-2">
                            <label
                                htmlFor={input.variable_id}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                {input.schema.name}
                                <span className="text-red-500 ml-1">*</span>
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
                                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
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
                                                // Store the file object itself
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
                                                : 'text-gray-500 dark:text-gray-400'
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
                                        } text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500`}
                                />
                            )}
                            {errors[input.variable_id] && (
                                <p className="text-sm text-red-500 dark:text-red-400">
                                    {errors[input.variable_id]}
                                </p>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/jobs')}
                            className="bg-white dark:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStart}
                            disabled={!areInputsValid()}
                            className={`flex items-center gap-2 ${areInputsValid()
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-blue-400 cursor-not-allowed'
                                } text-white`}
                        >
                            <PlayCircle className="h-4 w-4" />
                            Start Job
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Navigation */}
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/jobs')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </Button>
            </div>

            {/* Job Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {currentJob.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentJob.description || 'No description'}
                </p>
            </div>

            {/* Job Controls */}
            <div className="mb-6 flex gap-3">
                {currentJob.status !== JobStatus.RUNNING && (
                    <Button
                        onClick={handleStart}
                        className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <PlayCircle className="h-4 w-4" />
                        Start
                    </Button>
                )}
                {currentJob.status === JobStatus.RUNNING && (
                    <Button
                        onClick={handleCancel}
                        variant="destructive"
                        className="flex items-center gap-2"
                    >
                        <StopCircle className="h-4 w-4" />
                        Stop
                    </Button>
                )}
            </div>

            {/* Job Details */}
            <div className="grid gap-6">
                {/* Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Status
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${currentJob.status === JobStatus.RUNNING
                            ? 'bg-blue-500'
                            : currentJob.status === JobStatus.COMPLETED
                                ? 'bg-green-500'
                                : currentJob.status === JobStatus.FAILED
                                    ? 'bg-red-500'
                                    : 'bg-gray-500'
                            }`} />
                        <span className="text-gray-900 dark:text-gray-100">
                            {currentJob.status}
                        </span>
                    </div>
                </div>

                {/* Execution Progress */}
                {currentJob.execution_progress && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Execution Progress
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-900 dark:text-gray-100">
                                    Step {currentJob.execution_progress.current_step} of {currentJob.execution_progress.total_steps}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
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

                {/* Live Output */}
                {currentJob.live_output && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Live Output
                        </h3>
                        <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                            {currentJob.live_output}
                        </pre>
                    </div>
                )}

                {/* Timestamps */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Timestamps
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Created</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                {new Date(currentJob.created_at).toLocaleString()}
                            </span>
                        </div>
                        {currentJob.started_at && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Started</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {new Date(currentJob.started_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {currentJob.completed_at && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Completed</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {new Date(currentJob.completed_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Job; 