import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '../components/ui/dialog';
import { Plus, PlayCircle, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { JobStatus } from '../types/jobs';

const JobsManager: React.FC = () => {
    const navigate = useNavigate();
    const { jobs, createJob, deleteJob } = useJobs();
    const { workflows } = useWorkflows();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);

    const getStatusIcon = (status: JobStatus) => {
        switch (status) {
            case JobStatus.RUNNING:
                return <PlayCircle className="h-5 w-5 text-blue-500" />;
            case JobStatus.COMPLETED:
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case JobStatus.FAILED:
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    };

    const handleCreateJob = async () => {
        if (!selectedWorkflow) return;

        const workflow = workflows?.find(w => w.workflow_id === selectedWorkflow);
        if (!workflow) return;

        try {
            const job = await createJob({
                workflow_id: selectedWorkflow,
                name: `${workflow.name || 'Untitled Workflow'} Job`,
                input_variables: []
            });
            setIsCreateDialogOpen(false);
            navigate(`/jobs/${job.job_id}`);
        } catch (error) {
            console.error('Failed to create job:', error);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation(); // Prevent navigation to job details
        setJobToDelete(jobId);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;

        try {
            await deleteJob(jobToDelete);
            setIsDeleteDialogOpen(false);
            setJobToDelete(null);
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jobs</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Run and monitor your workflow executions</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2 bg-white dark:bg-gray-800">
                            <Plus className="h-4 w-4" />
                            Create Job
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white dark:bg-gray-800">
                        <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Job</DialogTitle>
                        </DialogHeader>

                        {/* Workflow Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {workflows?.map(workflow => (
                                <div
                                    key={workflow.workflow_id}
                                    onClick={() => setSelectedWorkflow(workflow.workflow_id)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all
                                              ${selectedWorkflow === workflow.workflow_id
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                >
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        {workflow.name || 'Untitled Workflow'}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {workflow.description || 'No description'}
                                    </p>
                                    <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{workflow.steps?.length || 0} steps</span>
                                        <span>•</span>
                                        <span>{workflow.inputs?.length || 0} inputs</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={!selectedWorkflow}
                                onClick={handleCreateJob}
                                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                                Continue
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">Delete Job</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete this job? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="bg-white dark:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Jobs List */}
            {jobs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No jobs yet
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Create a job to run a workflow with your inputs and see the results.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map(job => (
                        <div
                            key={job.job_id}
                            className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                                     p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => navigate(`/jobs/${job.job_id}`)}
                                >
                                    {getStatusIcon(job.status)}
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {job.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {job.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(job.created_at).toLocaleString()}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => handleDeleteClick(e, job.job_id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JobsManager; 