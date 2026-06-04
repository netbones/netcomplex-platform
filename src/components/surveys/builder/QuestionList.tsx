'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { SurveyQuestion } from './survey-types';
import { QuestionBlock } from './QuestionBlock';

interface QuestionListProps {
  questions: SurveyQuestion[];
  /** All section ids in the survey — used to compute "move between sections" */
  sectionIds: string[];
  /** Currently focused section id (null = ungrouped). */
  currentSectionId: string | null;
  onUpdateQuestion: (questionId: string, changes: Partial<SurveyQuestion>) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorder: (items: { id: string; order: number; sectionId: string | null }[]) => void;
}

interface SortableQuestionProps {
  question: SurveyQuestion;
  onUpdate: (changes: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
}

function SortableQuestion({ question, onUpdate, onDelete }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group ${isDragging ? 'z-10' : ''}`}
      {...attributes}
    >
      <div className="relative">
        <button
          type="button"
          {...listeners}
          className="absolute left-[-28px] top-3 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          data-no-dnd="true"
        >
          <GripVertical size={18} />
        </button>
        <QuestionBlock question={question} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  );
}

/**
 * Sortable question list with @dnd-kit integration.
 *
 * Reorders within the current section/container. Moving questions
 * between sections is handled by the outer SurveyEditor drag context
 * (which knows about section droppables too). For now, when a question
 * is dropped we call `onReorder` with the new order; section moves
 * rely on the same callback accepting a `sectionId` change.
 */
export function QuestionList({
  questions,
  currentSectionId,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorder,
}: QuestionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex(q => q.id === active.id);
    const newIndex = questions.findIndex(q => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
      id: q.id,
      order: idx,
      sectionId: q.sectionId ?? currentSectionId,
    }));

    onReorder(reordered);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (questions.length === 0) {
    return null;
  }

  const activeQuestion = activeId ? questions.find(q => q.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {questions.map(question => (
            <SortableQuestion
              key={question.id}
              question={question}
              onUpdate={changes => onUpdateQuestion(question.id, changes)}
              onDelete={() => onDeleteQuestion(question.id)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeQuestion ? (
          <div className="opacity-90 shadow-2xl">
            <QuestionBlock question={activeQuestion} onUpdate={() => {}} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
