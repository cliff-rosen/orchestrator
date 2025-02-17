import React from 'react';
import AssetList from '../components/common/AssetList';

const Jobs: React.FC = () => {
    const handleCreateJob = () => {
        // TODO: Implement job creation
        console.log('Create new job');
    };

    const handleEditJob = (jobId: string) => {
        // TODO: Implement job editing
        console.log('Edit job:', jobId);
    };

    const handleDeleteJob = (jobId: string) => {
        // TODO: Implement job deletion
        console.log('Delete job:', jobId);
    };

    return (
        <AssetList
            title="Jobs"
            assets={[]} // TODO: Replace with actual jobs data
            onCreateNew={handleCreateJob}
            onEdit={handleEditJob}
            onDelete={handleDeleteJob}
            createButtonText="Create Job"
            emptyStateMessage="No jobs created yet. Click 'Create Job' to run a workflow."
        />
    );
};

export default Jobs; 