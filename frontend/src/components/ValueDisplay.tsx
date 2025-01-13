import React from 'react';
import { SchemaValue } from '../hooks/schema/types';

interface ValueDisplayProps {
    value: SchemaValue;
    onEdit: (value: SchemaValue) => void;
}

const ValueDisplay: React.FC<ValueDisplayProps> = ({ value, onEdit }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {value.name} ({value.type})
                </h3>
                <button
                    onClick={() => onEdit(value)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md 
                             hover:bg-blue-700 transition-colors"
                >
                    Edit
                </button>
            </div>
            <pre className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md 
                          text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {JSON.stringify(value, null, 2)}
            </pre>
        </div>
    );
};

export default ValueDisplay; 