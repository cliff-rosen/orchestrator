import React from 'react';
import { Job, JobStatus } from '../../types/jobs';

interface JobProgressProps {
    job: Job;
}

export const JobProgress: React.FC<JobProgressProps> = ({ job }) => {
    const progress = job.execution_progress;
    if (!progress) return null;

    const percentage = Math.round((progress.current_step / progress.total_steps) * 100);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${job.status === JobStatus.RUNNING ? 'bg-indigo-400 animate-pulse' :
                        job.status === JobStatus.COMPLETED ? 'bg-gray-400' :
                            job.status === JobStatus.FAILED ? 'bg-rose-400' :
                                'bg-gray-400'
                        }`} />
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                        Step {Math.min(progress.current_step + 1, progress.total_steps)} of {progress.total_steps}
                    </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                    {percentage}% Complete
                </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${job.status === JobStatus.COMPLETED ? 'bg-gray-400' :
                        job.status === JobStatus.FAILED ? 'bg-rose-400' :
                            'bg-indigo-400'
                        }`}
                    style={{
                        width: `${percentage}%`
                    }}
                />
            </div>
        </div>
    );
}; 