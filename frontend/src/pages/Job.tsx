import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';

import { JobStatus, JobVariable } from '../types/jobs';
import { JobProgress } from '../components/job/JobProgress';
import { JobStepDetails } from '../components/job/JobStepDetails';
import { JobLiveOutput } from '../components/job/JobLiveOutput';
import { JobStepsList } from '../components/job/JobStepsList';
import { JobInputForm } from '../components/job/JobInputForm';
import JobMenuBar from '../components/job/JobMenuBar';

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

    console.log('Job.tsx', currentJob);

    // Load job data
    useEffect(() => {
        if (jobId) {
            console.log('Job.tsx loading job', jobId);
            loadJob(jobId);
        }
    }, [jobId, loadJob]);

    // Initialize input values when workflow inputs change
    useEffect(() => {
        console.log('Initializing input values:', { workflow, workflowInputs });
        // Remove this effect as input initialization is now handled by the context
    }, [workflow, currentJob, needsInput]);

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
    // console.log('Job render:', {
    //     needsInput,
    //     workflowInputs,
    //     inputValues,
    //     currentJob,
    //     workflow
    // });

    // // Add this near the other debug logging
    // console.log('Job controls:', {
    //     status: currentJob?.status,
    //     isRunning: currentJob?.status === JobStatus.RUNNING,
    //     JobStatus: JobStatus
    // });

    const handleStart = async () => {
        console.log('Job.tsx handleStart called', {
            jobId: currentJob.job_id,
            status: currentJob.status,
            needsInput,
            workflowInputs,
            inputValues
        });

        if (needsInput) {
            if (!validateInputs()) return;

            // Convert input values to JobVariables
            const jobVariables: JobVariable[] = workflowInputs.map(input => ({
                name: input.name,
                variable_id: input.variable_id,
                schema: input.schema,
                value: inputValues[input.variable_id],
                required: true
            }));

            console.log('Starting job with variables:', currentJob.job_id, jobVariables);

            try {
                await startJob(jobVariables);
            } catch (error) {
                console.error('Failed to start job:', error);
            }
        } else {
            console.log('Starting job without variables');
            try {
                await startJob();
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
        console.log('Job.tsx handleRestart called', {
            jobId: currentJob.job_id,
            status: currentJob.status
        });
        try {
            await resetJob(currentJob.job_id);
            console.log('back from resetJob', {
                jobId: currentJob.job_id,
                status: currentJob.status
            });

        } catch (error) {
            console.error('Failed to restart job:', error);
        }
    };

    return (
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2">
            <JobMenuBar
                jobName={currentJob.name}
                workflow={workflow}
                status={currentJob.status}
                needsInput={needsInput}
                areInputsValid={areInputsValid}
                onBack={() => {
                    resetCurrentJob();
                    navigate('/jobs');
                }}
                onStart={handleStart}
                onCancel={handleCancel}
                onRestart={handleRestart}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-3 md:gap-6 py-4">
                {/* Steps List - Left Side */}
                <div className="col-span-3">
                    <JobStepsList
                        job={currentJob}
                        workflow={workflow}
                        needsInput={needsInput}
                    />
                </div>

                {/* Execution Details - Right Side */}
                <div className="col-span-9 space-y-6">
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
                                    <JobLiveOutput job={currentJob} workflow={workflow} />
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