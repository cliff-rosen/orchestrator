import React, { useState } from 'react';

export interface ObjectRendererProps {
    object: Record<string, any>;
    maxInitialProperties?: number;
    className?: string;
}

/**
 * Renders a JavaScript object with syntax highlighting and expandable properties.
 */
export const ObjectRenderer: React.FC<ObjectRendererProps> = ({
    object,
    maxInitialProperties = 5,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Convert object to formatted JSON string
    const formattedJson = JSON.stringify(object, null, 2);

    // Get all entries and determine if we need to truncate
    const entries = Object.entries(object);
    const hasMoreProperties = entries.length > maxInitialProperties;
    const displayEntries = isExpanded
        ? entries
        : entries.slice(0, maxInitialProperties);

    const toggleExpand = () => setIsExpanded(prev => !prev);

    // For empty objects
    if (entries.length === 0) {
        return <span className="text-gray-500 dark:text-gray-400 italic">Empty object</span>;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                    {displayEntries.map(([key, value]) => (
                        <div key={key} className="grid grid-cols-12 gap-2">
                            <div className="col-span-4 truncate font-medium text-blue-600 dark:text-blue-400">
                                {key}:
                            </div>
                            <div className="col-span-8 text-gray-800 dark:text-gray-200 truncate">
                                {typeof value === 'object' && value !== null
                                    ? (Array.isArray(value)
                                        ? `Array(${value.length})`
                                        : `Object(${Object.keys(value).length})`)
                                    : String(value)
                                }
                            </div>
                        </div>
                    ))}
                </div>

                {/* Show full JSON on hover or click */}
                <details className="mt-3">
                    <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                        View raw JSON
                    </summary>
                    <pre className="text-xs overflow-x-auto p-2 mt-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                        {formattedJson}
                    </pre>
                </details>
            </div>

            {hasMoreProperties && (
                <button
                    onClick={toggleExpand}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    {isExpanded
                        ? "Show Less"
                        : `Show ${entries.length - maxInitialProperties} More Properties...`}
                </button>
            )}
        </div>
    );
};

export default ObjectRenderer; 