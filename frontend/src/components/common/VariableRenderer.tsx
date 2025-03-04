import React from 'react';
import { ArrayRenderer } from './ArrayRenderer';
import { TextRenderer } from './TextRenderer';
import { ObjectRenderer } from './ObjectRenderer';
import MarkdownRenderer from './MarkdownRenderer';

export interface VariableRendererProps {
    value: any;
    schema?: any; // Optional schema information
    isMarkdown?: boolean;
    maxTextLength?: number;
    maxArrayItems?: number;
    className?: string;
}

/**
 * A universal component for rendering variable values of different types.
 * Handles arrays, objects, text (including markdown), and primitive values.
 */
export const VariableRenderer: React.FC<VariableRendererProps> = ({
    value,
    schema,
    isMarkdown = false,
    maxTextLength = 200,
    maxArrayItems = 5,
    className = ''
}) => {
    // Handle undefined or null values
    if (value === undefined || value === null) {
        return (
            <span className="text-gray-400 dark:text-gray-500 italic">
                Not set
            </span>
        );
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return (
            <ArrayRenderer
                items={value}
                maxInitialItems={maxArrayItems}
                className={className}
            />
        );
    }

    // Handle objects
    if (typeof value === 'object') {
        // Special handling for file objects
        if (schema?.type === 'file' && value.file_id) {
            return <span className={`text-blue-600 dark:text-blue-400 ${className}`}>File: {value.name || value.file_id}</span>;
        }

        return <ObjectRenderer object={value} className={className} />;
    }

    // Handle text that should be rendered as markdown
    const stringValue = String(value);
    const hasMarkdownSyntax = /(\*|#|\||\n|```|>|-)/.test(stringValue);

    if (isMarkdown || hasMarkdownSyntax) {
        return (
            <div className={className}>
                <TextRenderer text={stringValue} maxLength={maxTextLength}>
                    {(text) => <MarkdownRenderer content={text} />}
                </TextRenderer>
            </div>
        );
    }

    // For simple primitive values
    return <span className={className}>{stringValue}</span>;
};

export default VariableRenderer; 