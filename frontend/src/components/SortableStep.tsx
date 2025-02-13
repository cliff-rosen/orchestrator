import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RuntimeWorkflowStep } from '../types/workflows';
import { GripVertical } from 'lucide-react';

interface SortableStepProps {
    step: RuntimeWorkflowStep;
    index: number;
    isActive: boolean;
    isCompleted: boolean;
    isEditMode: boolean;
    onClick: () => void;
}

export const SortableStep: React.FC<SortableStepProps> = ({
    step,
    index,
    isActive,
    isCompleted,
    isEditMode,
    onClick,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.step_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isEditMode ? 'cursor-pointer' : ''}
                ${isDragging ? 'opacity-50' : ''}
                ${isActive
                    ? 'bg-blue-50 border border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-200'
                    : isCompleted
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                }`}
            onClick={onClick}
        >
            {isEditMode && (
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium shrink-0
                ${isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                    : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
            >
                {!isEditMode && index === 0 ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    !isEditMode ? index : index + 1
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{step.label}</div>
                {step.description && (
                    <div className="text-xs opacity-80 truncate">{step.description}</div>
                )}
            </div>
        </div>
    );
}; 