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
}

const WorkflowStepsList: React.FC<WorkflowStepsListProps> = ({
    steps,
    activeStep,
    isEditMode,
    onStepClick,
    onAddStep,
    onReorder,
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

    return (
        <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
            {/* Steps List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
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
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

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