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
    // Helper function to get the tool ID consistently
    const getToolId = (tool: Tool) => (tool as any).tool_id || tool.id;

    return (
        <div className="space-y-2">
            <select
                value={selectedTool ? getToolId(selectedTool) : ''}
                onChange={(e) => {
                    const tool = tools.find(t => getToolId(t) === e.target.value);
                    console.log('Tool selected:', tool);
                    if (tool) {
                        onSelect(tool);
                    }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
                <option key="default" value="">Select a tool...</option>
                {tools.map(tool => (
                    <option key={getToolId(tool)} value={getToolId(tool)}>
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
