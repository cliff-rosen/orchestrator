import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import { PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { JobStatus, JobVariable } from '../types/jobs';
import { JobProgress } from '../components/job/JobProgress';
import { JobStepDetails } from '../components/job/JobStepDetails';
import { JobLiveOutput } from '../components/job/JobLiveOutput';
import { JobStepsList } from '../components/job/JobStepsList';
import { JobInputForm } from '../components/job/JobInputForm';

const Job: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const {
        currentJob,
        loadJob,
        startJob,
        cancelJob,
        resetJob,
        resetCurrentJob,
        inputValues,
        inputErrors,
        setInputValue,
        validateInputs,
        areInputsValid
    } = useJobs();
    const { workflows } = useWorkflows();

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
        // Remove this effect as input initialization is now handled by the context
    }, [workflow, needsInput]);

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

    const handleStart = async () => {
        console.log('handleStart called', {
            jobId: currentJob.job_id,
            status: currentJob.status,
            needsInput,
            workflowInputs,
            inputValues
        });

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

            console.log('Starting job with variables:', jobVariables);

            try {
                await startJob(currentJob.job_id, jobVariables);
            } catch (error) {
                console.error('Failed to start job:', error);
            }
        } else {
            console.log('Starting job without variables');
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
            await resetJob(currentJob.job_id);
        } catch (error) {
            console.error('Failed to restart job:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-2">
            {/* Unified Header */}
            <div className="flex justify-between items-center mb-8">
                {/* Left side: Back button and Job info */}
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/jobs')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Jobs
                    </Button>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                            {currentJob.name}
                        </h1>
                        <div className="flex items-center gap-4 text-sm">
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
                </div>

                {/* Right side: Job Controls */}
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6 py-4">
                {/* Steps List - Left Side */}
                <div className="col-span-4">
                    <JobStepsList
                        job={currentJob}
                        workflow={workflow}
                        needsInput={needsInput}
                    />
                </div>

                {/* Execution Details - Right Side */}
                <div className="col-span-8 space-y-6">
                    {needsInput ? (
                        <JobInputForm
                            workflowInputs={workflowInputs}
                            inputValues={inputValues}
                            inputErrors={inputErrors}
                            setInputValue={setInputValue}
                        />
                    ) : (
                        <>
                            {/* Live Status Dashboard */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {/* Progress Bar Section */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <JobProgress job={currentJob} />
                                </div>

                                {/* Current Step Section */}
                                <div className="p-4">
                                    <JobLiveOutput job={currentJob} />
                                </div>
                            </div>

                            {/* Job History Log */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                                            Job History
                                        </h2>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentJob.status === JobStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                                            currentJob.status === JobStatus.FAILED ? 'bg-red-100 text-red-800' :
                                                currentJob.status === JobStatus.RUNNING ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {currentJob.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <JobStepDetails job={currentJob} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Job; 