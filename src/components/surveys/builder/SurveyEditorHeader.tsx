'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Survey, SurveyStatus } from './survey-types';
import { BuilderRichText } from './BuilderRichText';

interface SurveyEditorHeaderProps {
  survey: Survey;
  onUpdateSurvey: (changes: Partial<Pick<Survey, 'title' | 'description' | 'status'>>) => void;
}

const STATUS_COLORS: Record<SurveyStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-red-100 text-red-800',
};

export function SurveyEditorHeader({ survey, onUpdateSurvey }: SurveyEditorHeaderProps) {
  const [titleDraft, setTitleDraft] = useState(survey.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(survey.description));

  // Keep local draft in sync if the survey changes externally
  if (!editingTitle && titleDraft !== survey.title) {
    setTitleDraft(survey.title);
  }

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== survey.title) {
      onUpdateSurvey({ title: titleDraft.trim() });
    } else {
      setTitleDraft(survey.title);
    }
  };

  const cycleStatus = () => {
    const next: SurveyStatus =
      survey.status === 'DRAFT' ? 'ACTIVE' : survey.status === 'ACTIVE' ? 'CLOSED' : 'DRAFT';
    onUpdateSurvey({ status: next });
  };

  const commitDescription = (html: string) => {
    if (html !== survey.description) {
      onUpdateSurvey({ description: html });
    }
  };

  return (
    <header className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setTitleDraft(survey.title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none bg-transparent"
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="text-2xl font-bold text-gray-900 cursor-text hover:bg-gray-50 px-1 -mx-1 rounded"
              title="Click to edit"
            >
              {survey.title}
            </h1>
          )}
        </div>

        <button
          onClick={cycleStatus}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            STATUS_COLORS[survey.status]
          } hover:opacity-80`}
          title="Click to cycle status"
        >
          {survey.status}
        </button>

        <Link
          href={`/surveys/${survey.id}`}
          target="_blank"
          className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
        >
          Preview
        </Link>

        <Link
          href={`/admin/surveys/${survey.id}`}
          className="px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          Back to results
        </Link>
      </div>

      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setDescriptionOpen(v => !v)}
          className="w-full px-6 py-2 flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          data-no-dnd="true"
        >
          <span className="font-medium">
            {descriptionOpen ? 'Hide description' : 'Add / edit description'}
          </span>
          {descriptionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {descriptionOpen && (
          <div className="px-6 pb-4" data-no-dnd="true">
            <BuilderRichText
              value={survey.description ?? ''}
              onChange={commitDescription}
              placeholder="Describe what this survey is for. You can include images and basic formatting."
              ariaLabel="Survey description"
            />
          </div>
        )}
      </div>
    </header>
  );
}
