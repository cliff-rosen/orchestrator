import React, { useState } from 'react';
import FileLibrary from '../components/FileLibrary';

const FilesManager: React.FC = () => {
    const [selectedFileId, setSelectedFileId] = useState<string | undefined>();

    console.log('Files component rendered');

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    File Management
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-6">
                    <FileLibrary
                        onFileSelect={setSelectedFileId}
                        selectedFileId={selectedFileId}
                    />
                </div>
            </div>
        </div>
    );
};

export default FilesManager; 