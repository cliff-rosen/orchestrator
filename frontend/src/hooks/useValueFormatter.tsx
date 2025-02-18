import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Constants for text truncation
const MAX_TEXT_LENGTH = 200;
const MAX_ARRAY_LENGTH = 3;
const MAX_ARRAY_ITEM_LENGTH = 100;

type FormatValueFunction = (value: any, isOutput?: boolean) => React.ReactNode;

interface UseValueFormatterReturn {
    formatValue: FormatValueFunction;
}

export const useValueFormatter = (): UseValueFormatterReturn => {
    const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedValues(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatValue: FormatValueFunction = (value: any, isOutput = false) => {
        if (value === undefined || value === null) {
            return (
                <span className="text-gray-400 dark:text-gray-500 italic">
                    Not set
                </span>
            );
        }

        // Handle arrays
        if (Array.isArray(value)) {
            const id = `array-${JSON.stringify(value).slice(0, 50)}`;
            const isExpanded = expandedValues[id];
            const items = value;
            const displayItems = isExpanded ? items : items.slice(0, MAX_ARRAY_LENGTH);
            const hasMore = items.length > MAX_ARRAY_LENGTH;

            return (
                <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                    {displayItems.map((item: any, index: number) => (
                        <div
                            key={index}
                            className="text-sm font-medium text-gray-700 dark:text-gray-200 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                        >
                            <span className="font-normal text-gray-500 dark:text-gray-400 mr-2">
                                {index + 1}.
                            </span>
                            {String(item)}
                        </div>
                    ))}
                    {hasMore && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : `Show ${items.length - MAX_ARRAY_LENGTH} More...`}
                        </button>
                    )}
                </div>
            );
        }

        // Handle objects
        if (typeof value === 'object') {
            return (
                <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                    <pre className="text-sm text-gray-700 dark:text-gray-200">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            );
        }

        const text = String(value);
        const id = `text-${text.slice(0, 50)}`;
        const isExpanded = expandedValues[id];

        // Only use markdown formatting if explicitly requested for output
        // and the text is long or contains newlines
        if (isOutput && (text.length > MAX_TEXT_LENGTH || text.includes('\n'))) {
            const displayText = text.length > MAX_TEXT_LENGTH && !isExpanded
                ? `${text.substring(0, MAX_TEXT_LENGTH)}...`
                : text;

            return (
                <div className="space-y-2">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }) => (
                                        <p className="text-gray-700 dark:text-gray-200">{children}</p>
                                    ),
                                    table: props => (
                                        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
                                            {props.children}
                                        </table>
                                    ),
                                    thead: props => (
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            {props.children}
                                        </thead>
                                    ),
                                    tbody: props => (
                                        <tbody className="bg-white dark:bg-gray-900">
                                            {props.children}
                                        </tbody>
                                    ),
                                    tr: props => (
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            {props.children}
                                        </tr>
                                    ),
                                    th: props => (
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                            {props.children}
                                        </th>
                                    ),
                                    td: props => (
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                            {props.children}
                                        </td>
                                    ),
                                    code: props => (
                                        <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono text-gray-700 dark:text-gray-200">
                                            {props.children}
                                        </code>
                                    ),
                                    pre: props => (
                                        <pre className="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto text-gray-700 dark:text-gray-200">
                                            {props.children}
                                        </pre>
                                    )
                                }}
                            >
                                {displayText}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {text.length > MAX_TEXT_LENGTH && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : 'Show More...'}
                        </button>
                    )}
                </div>
            );
        }

        // For simple text values, just return the text directly
        return text;
    };

    return { formatValue };
}; 