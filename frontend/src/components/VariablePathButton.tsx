import React, { useState } from 'react';
import { WorkflowVariable } from '../types/workflows';
import { Schema } from '../types/schema';
import { formatVariablePath } from '../lib/utils/variableUIUtils';
import VariablePathModal from './VariablePathModal';

interface VariablePathButtonProps {
    variables: WorkflowVariable[];
    value: string;
    onChange: (value: string) => void;
    targetSchema?: Schema | null;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    modalTitle?: string;
}

const VariablePathButton: React.FC<VariablePathButtonProps> = ({
    variables = [],
    value,
    onChange,
    targetSchema = null,
    placeholder = 'Select variable',
    className = '',
    disabled = false,
    modalTitle
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => {
        if (!disabled) {
            setIsModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (newValue: string) => {
        onChange(newValue);
        closeModal();
    };

    const baseClasses = `relative w-full px-3 py-2 border rounded-md text-sm 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-800 cursor-pointer'}
                        ${className}`;

    return (
        <>
            <div
                className={baseClasses}
                onClick={openModal}
            >
                <div className="flex items-center justify-between">
                    <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                        {value ? formatVariablePath(value) : placeholder}
                    </span>
                    <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            </div>

            <VariablePathModal
                isOpen={isModalOpen}
                onClose={closeModal}
                variables={variables}
                value={value}
                onChange={handleChange}
                targetSchema={targetSchema}
                title={modalTitle || `Select ${targetSchema?.type || 'variable'}`}
            />
        </>
    );
};

export default VariablePathButton; 