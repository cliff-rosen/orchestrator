import React from 'react';
import { Tool } from '../types/tools';

interface ToolSelectorProps {
    tools?: Tool[];
    selectedTool?: Tool;
    onSelect: (tool: Tool) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
    tools = [],
    selectedTool,
    onSelect,
}) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Tool
            </label>
            <select
                value={selectedTool?.id || ''}
                onChange={(e) => {
                    const tool = tools.find(t => t.id === e.target.value);
                    if (tool) onSelect(tool);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
                <option value="">Select a tool...</option>
                {tools?.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                        {tool.name}
                    </option>
                ))}
            </select>
            {selectedTool && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {selectedTool.description}
                </div>
            )}
        </div>
    );
};

export default ToolSelector;
