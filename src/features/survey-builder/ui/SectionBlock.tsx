'use client';

import { useState, useEffect, forwardRef, createContext, useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { SurveySection, SurveyQuestion, QuestionType } from '@entities/survey';
import { QuestionBlock } from './QuestionBlock';
import { BlockPalette } from './BlockPalette';
import { BuilderRichText } from './BuilderRichText';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type DragListeners = Record<string, Function> | undefined;

const SortableListenersContext = createContext<DragListeners>(undefined);

function useSortableListeners() {
  return useContext(SortableListenersContext);
}

interface SectionBlockProps {
  section: SurveySection;
  questions: SurveyQuestion[];
  onUpdateSection: (sectionId: string, changes: Partial<SurveySection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (questionId: string, changes: Partial<SurveyQuestion>) => void;
  onDeleteQuestion: (questionId: string) => void;
  /**
   * When true, this section is being rendered inside a SortableSection
   * wrapper (provides drag handle + transform). When false (default),
   * the section renders standalone with a non-functional drag handle
   * placeholder.
   */
  sortable?: boolean;
  /**
   * Debounced change handler for the section description.
   * Falls back to immediate save via onUpdateSection if not provided.
   */
  onDescriptionChange?: (html: string) => void;
}

interface SortableSectionWrapperProps {
  id: string;
  children: React.ReactNode;
}

/**
 * Wraps a section in @dnd-kit's `useSortable` so the editor can reorder
 * sections via drag. The drag handle lives inside the section header —
 * here we just attach the transform + opacity and let the inner
 * SectionBlock render its own drag-handle button.
 */
function SortableSectionWrapper({ id, children }: SortableSectionWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <SortableListenersContext.Provider value={listeners}>
      <div
        ref={setNodeRef}
        style={style}
        data-section-id={id}
        className={isDragging ? 'z-10' : ''}
        {...attributes}
      >
        {children}
      </div>
    </SortableListenersContext.Provider>
  );
}

/**
 * Collapsible accordion section in the survey builder.
 *
 * - Indigo-400 left accent border for visual grouping
 * - Inline-editable title and description (PATCH on blur)
 * - Expand/collapse chevron toggles the question list
 * - When `sortable` is true, the whole section is a draggable item —
 *   the drag handle in the header is wired to the @dnd-kit Sortable
 *   context provided by SurveyEditor.
 * - Delete: requires a second click within 3s; questions are ungrouped
 *   (sectionId → null) by the parent's onDeleteSection handler — never lost
 * - "Add question to this section" inline palette posts to the same
 *   /api/surveys/:id/questions endpoint with the sectionId in the body
 */
export const SectionBlock = forwardRef<HTMLElement, SectionBlockProps>(function SectionBlock(
  {
    section,
    questions,
    onUpdateSection,
    onDeleteSection,
    onAddQuestion,
    onUpdateQuestion,
    onDeleteQuestion,
    sortable = false,
    onDescriptionChange,
  },
  ref
) {
  const [expanded, setExpanded] = useState(true);
  const [titleDraft, setTitleDraft] = useState(section.title ?? '');
  const [descDraft, setDescDraft] = useState(section.description ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setTitleDraft(section.title ?? '');
  }, [section.id, section.title]);

  useEffect(() => {
    setDescDraft(section.description ?? '');
  }, [section.id, section.description]);

  const isTempId = section.id.startsWith('temp-');

  const commitTitle = () => {
    if (titleDraft !== section.title) {
      onUpdateSection(section.id, { title: titleDraft });
    }
  };

  const commitDescription = () => {
    if (descDraft !== (section.description ?? '')) {
      if (onDescriptionChange) {
        onDescriptionChange(descDraft);
      } else {
        onUpdateSection(section.id, { description: descDraft });
      }
    }
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDeleteSection(section.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const sortableListeners = useSortableListeners();

  const content = (
    <section
      ref={ref}
      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden border-l-4 border-l-indigo-400"
    >
      <header className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start gap-3">
          {sortable ? (
            <button
              type="button"
              {...sortableListeners}
              className="mt-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing"
              aria-label="Drag section to reorder"
              title="Drag section to reorder"
              data-no-dnd="true"
            >
              <GripVertical size={18} />
            </button>
          ) : (
            <span
              className="mt-1 text-gray-200"
              aria-hidden="true"
              title="Drag handle (wrap with SortableSectionWrapper to enable)"
            >
              <GripVertical size={18} />
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="Section title"
                data-no-dnd="true"
                className="flex-1 text-base font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1"
                disabled={isTempId}
              />
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label={expanded ? 'Collapse section' : 'Expand section'}
                data-no-dnd="true"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <div className="mt-2">
              <BuilderRichText
                value={descDraft}
                onChange={setDescDraft}
                onBlur={commitDescription}
                placeholder="Optional description for this section (supports images and formatting)"
                ariaLabel={`Section ${section.title ?? 'Untitled'} description`}
                compact
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            data-no-dnd="true"
            className={`p-1.5 rounded transition-colors ${
              showDeleteConfirm
                ? 'bg-red-100 text-red-700'
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title={
              showDeleteConfirm
                ? 'Click again to confirm — questions will be ungrouped'
                : 'Delete section'
            }
            disabled={isTempId}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {expanded && (
        <div className="px-4 py-4 space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">
              This section is empty. Add a question to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map(question => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  onUpdate={changes => onUpdateQuestion(question.id, changes)}
                  onDelete={() => onDeleteQuestion(question.id)}
                />
              ))}
            </div>
          )}

          <div className="pt-2">
            {isTempId ? (
              <p className="text-xs text-gray-400 italic text-center">Saving section…</p>
            ) : (
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Plus size={14} />
                  <span>Add a question to this section</span>
                </div>
                <div className="mt-2">
                  <BlockPalette onSelect={onAddQuestion} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );

  if (!sortable) return content;

  return <SortableSectionWrapper id={section.id}>{content}</SortableSectionWrapper>;
});
