import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { Button } from '../components/ui/button';
import { PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { JobStatus } from '../types/jobs';

const Job: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { currentJob, loadJob, startJob, cancelJob, resetCurrentJob } = useJobs();

    useEffect(() => {
        if (jobId) {
            loadJob(jobId);
        }
        return () => {
            resetCurrentJob();
        };
    }, [jobId, loadJob, resetCurrentJob]);

    if (!currentJob) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Job not found
                    </h2>
                </div>
            </div>
        );
    }

    const handleStart = async () => {
        try {
            await startJob(currentJob.job_id);
        } catch (error) {
            console.error('Failed to start job:', error);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelJob(currentJob.job_id);
        } catch (error) {
            console.error('Failed to cancel job:', error);
        }
    };

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
                                    {currentJob.execution_progress.current_step} of {currentJob.execution_progress.total_steps} steps
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