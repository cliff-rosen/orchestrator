import React, { useState } from 'react';
import { ObjectRenderer } from './ObjectRenderer';

export interface ArrayRendererProps {
    items: any[];
    maxInitialItems?: number;
    className?: string;
}

/**
 * Renders an array of items with expandable functionality.
 * Shows a limited number of items initially with a "Show More" button.
 */
export const ArrayRenderer: React.FC<ArrayRendererProps> = ({
    items,
    maxInitialItems = 5,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!items.length) {
        return <span className="text-gray-500 dark:text-gray-400 italic">Empty array</span>;
    }

    const displayItems = isExpanded ? items : items.slice(0, maxInitialItems);
    const hasMore = items.length > maxInitialItems;

    const toggleExpand = () => setIsExpanded(prev => !prev);

    return (
        <div className={`space-y-2 rounded-md ${className}`}>
            <div className="space-y-2 pl-1 border-l-2 border-gray-200 dark:border-gray-700">
                {displayItems.map((item, index) => (
                    <div
                        key={index}
                        className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start">
                            <span className="inline-block px-1.5 py-0.5 mr-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                                {index + 1}
                            </span>
                            {typeof item === 'object' && item !== null ? (
                                <ObjectRenderer object={item} />
                            ) : (
                                <span className="text-gray-800 dark:text-gray-200">{String(item)}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={toggleExpand}
                    className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    {isExpanded
                        ? "Show Less"
                        : `Show ${items.length - maxInitialItems} More Items...`}
                </button>
            )}
        </div>
    );
};

export default ArrayRenderer; 