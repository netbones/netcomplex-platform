'use client';

import { useState, useEffect } from 'react';
import { GripVertical, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { SurveySection, SurveyQuestion, QuestionType } from './survey-types';
import { QuestionBlock } from './QuestionBlock';
import { BlockPalette } from './BlockPalette';

interface SectionBlockProps {
  section: SurveySection;
  questions: SurveyQuestion[];
  onUpdateSection: (sectionId: string, changes: Partial<SurveySection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (questionId: string, changes: Partial<SurveyQuestion>) => void;
  onDeleteQuestion: (questionId: string) => void;
}

/**
 * Collapsible accordion section in the survey builder.
 *
 * - Indigo-400 left accent border for visual grouping
 * - Inline-editable title and description (PATCH on blur)
 * - Expand/collapse chevron toggles the question list
 * - Drag handle is a placeholder for Plan 04 (reorder wiring)
 * - Delete: requires a second click within 3s; questions are ungrouped
 *   (sectionId → null) by the parent's onDeleteSection handler — never lost
 * - "Add question to this section" inline palette posts to the same
 *   /api/surveys/:id/questions endpoint with the sectionId in the body
 */
export function SectionBlock({
  section,
  questions,
  onUpdateSection,
  onDeleteSection,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
}: SectionBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const [titleDraft, setTitleDraft] = useState(section.title ?? '');
  const [descDraft, setDescDraft] = useState(section.description ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Keep local drafts in sync when the section changes externally
  useEffect(() => {
    setTitleDraft(section.title ?? '');
    setDescDraft(section.description ?? '');
  }, [section.id, section.title, section.description]);

  const isTempId = section.id.startsWith('temp-');

  const commitTitle = () => {
    if (titleDraft !== section.title) {
      onUpdateSection(section.id, { title: titleDraft });
    }
  };

  const commitDescription = () => {
    if (descDraft !== section.description) {
      onUpdateSection(section.id, { description: descDraft });
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

  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden border-l-4 border-l-indigo-400">
      <header className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-1 text-gray-400 cursor-grab"
            aria-label="Drag to reorder"
            disabled
            title="Drag handle (wired in Plan 04)"
          >
            <GripVertical size={16} />
          </button>

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
                className="flex-1 text-base font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1"
                disabled={isTempId}
              />
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label={expanded ? 'Collapse section' : 'Expand section'}
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <textarea
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              onBlur={commitDescription}
              placeholder="Optional description for this section"
              rows={1}
              className="mt-1 w-full text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1 resize-none"
              disabled={isTempId}
            />
          </div>

          <button
            type="button"
            onClick={handleDelete}
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
              No questions in this section yet
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
}
