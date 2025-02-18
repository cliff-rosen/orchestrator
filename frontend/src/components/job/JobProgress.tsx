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
                    <span className={`h-2 w-2 rounded-full ${job.status === JobStatus.RUNNING ? 'bg-blue-500 animate-pulse' :
                            job.status === JobStatus.COMPLETED ? 'bg-green-500' :
                                job.status === JobStatus.FAILED ? 'bg-red-500' :
                                    'bg-gray-500'
                        }`} />
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                        Step {Math.min(progress.current_step + 1, progress.total_steps)} of {progress.total_steps}
                    </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                    {percentage}% Complete
                </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${job.status === JobStatus.COMPLETED ? 'bg-green-500' :
                            job.status === JobStatus.FAILED ? 'bg-red-500' :
                                'bg-blue-500'
                        }`}
                    style={{
                        width: `${percentage}%`
                    }}
                />
            </div>
        </div>
    );
}; 