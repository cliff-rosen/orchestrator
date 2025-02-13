import React from 'react';

interface Asset {
    id: string;
    name: string;
    description?: string;
    metadata?: {
        label: string;
        value: string | number;
    }[];
}

interface AssetListProps {
    title: string;
    assets: Asset[];
    onCreateNew: () => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    createButtonText?: string;
    emptyStateMessage?: string;
}

const AssetList: React.FC<AssetListProps> = ({
    title,
    assets,
    onCreateNew,
    onEdit,
    onDelete,
    createButtonText = 'Create New',
    emptyStateMessage = 'No items found'
}) => {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
                <button
                    onClick={onCreateNew}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {createButtonText}
                </button>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{emptyStateMessage}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map(asset => (
                        <div
                            key={asset.id}
                            onClick={() => onEdit(asset.id)}
                            className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 
                                     border border-gray-200 dark:border-gray-700
                                     hover:border-blue-500 dark:hover:border-blue-400
                                     hover:shadow-md transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {asset.name}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to delete "${asset.name}"?`)) {
                                            onDelete(asset.id);
                                        }
                                    }}
                                    className="text-gray-400 hover:text-red-600 dark:text-gray-500 
                                             dark:hover:text-red-400 opacity-0 group-hover:opacity-100 
                                             transition-opacity focus:opacity-100"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            {asset.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {asset.description}
                                </p>
                            )}
                            {asset.metadata && (
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                    {asset.metadata.map((meta, index) => (
                                        <span key={meta.label}>
                                            {meta.value} {meta.label}
                                            {index < asset.metadata!.length - 1 && ' • '}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssetList; 