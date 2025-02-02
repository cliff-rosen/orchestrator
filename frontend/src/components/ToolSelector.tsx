import React from 'react';
import { Tool } from '../types/tools';

interface ToolSelectorProps {
    tools: Tool[];
    selectedTool: Tool | undefined;
    onSelect: (tool: Tool) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
    tools,
    selectedTool,
    onSelect
}) => {
    return (
        <div className="space-y-2">
            <select
                value={selectedTool?.id || ''}
                onChange={(e) => {
                    const tool = tools.find(t => t.id === e.target.value);
                    if (tool) onSelect(tool);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
                <option value="" className="text-sm">Select a tool...</option>
                {tools.map(tool => (
                    <option key={tool.id} value={tool.id}
                        className="text-sm text-gray-900 dark:text-gray-100">
                        {tool.name}
                    </option>
                ))}
            </select>
            {selectedTool && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedTool.description}
                </p>
            )}
        </div>
    );
};

export default ToolSelector;
