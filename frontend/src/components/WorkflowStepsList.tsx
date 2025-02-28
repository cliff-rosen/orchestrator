import React from 'react';
import { RuntimeWorkflowStep } from '../types/workflows';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStep } from './SortableStep';

interface WorkflowStepsListProps {
    steps: RuntimeWorkflowStep[];
    activeStep: number;
    isEditMode: boolean;
    onStepClick: (index: number) => void;
    onAddStep: () => void;
    onReorder?: (steps: RuntimeWorkflowStep[]) => void;
    onStepDelete: (stepId: string) => void;
    isCollapsed?: boolean;
}

const WorkflowStepsList: React.FC<WorkflowStepsListProps> = ({
    steps,
    activeStep,
    isEditMode,
    onStepClick,
    onAddStep,
    onReorder,
    onStepDelete,
    isCollapsed = false,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = steps.findIndex((step) => step.step_id === active.id);
            const newIndex = steps.findIndex((step) => step.step_id === over.id);

            const newSteps = arrayMove(steps, oldIndex, newIndex);
            onReorder?.(newSteps);
        }
    };

    if (isCollapsed) {
        return (
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="flex flex-col gap-2 p-2">
                    {steps.map((step, index) => (
                        <button
                            key={step.step_id}
                            onClick={() => onStepClick(index)}
                            className={`w-full flex justify-center p-2 rounded-md transition-colors
                                ${index === activeStep
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                            title={step.label}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                                ${index === activeStep
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
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
                        </button>
                    ))}
                    {isEditMode && (
                        <button
                            onClick={onAddStep}
                            className="w-full flex justify-center p-2 text-gray-600 dark:text-gray-300 
                                     hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                            title="Add Step"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={steps.map(step => step.step_id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2 p-2">
                        {steps.map((step, index) => (
                            <SortableStep
                                key={step.step_id}
                                step={step}
                                index={index}
                                isActive={index === activeStep}
                                isCompleted={index < activeStep && !isEditMode}
                                isEditMode={isEditMode}
                                onClick={() => onStepClick(index)}
                                onDelete={() => onStepDelete(step.step_id)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add Step Button - Fixed at bottom */}
            {isEditMode && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onAddStep}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 
                                 bg-gray-50 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300 
                                 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400
                                 transition-colors text-sm font-medium"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        <span>Add Step</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkflowStepsList; 