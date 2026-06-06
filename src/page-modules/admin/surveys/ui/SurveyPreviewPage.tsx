'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logError } from '@shared/lib';
import { LoadingSpinner } from '@shared/ui';
import {
  getTypeMeta,
  type Survey,
  type SurveyQuestion,
  type SurveySection,
  type QuestionType,
} from '@entities/survey';
// We'll need to export these from features/survey-builder
import {
  SingleChoiceBlock,
  MultipleChoiceBlock,
  TextBlock,
  RatingBlock,
  YesNoBlock,
  LinearScaleBlock,
} from '@features/survey-builder';

const PREVIEW_MAP: Record<QuestionType, React.ComponentType<{ question: SurveyQuestion }>> = {
  SINGLE_CHOICE: SingleChoiceBlock.Preview,
  MULTIPLE_CHOICE: MultipleChoiceBlock.Preview,
  TEXT: TextBlock.Preview,
  RATING: RatingBlock.Preview,
  YES_NO: YesNoBlock.Preview,
  LINEAR_SCALE: LinearScaleBlock.Preview,
};

interface SurveyPreviewPageProps {
  params: Promise<{ id: string }>;
}

export function SurveyPreviewPage({ params }: SurveyPreviewPageProps) {
  const { id: surveyId } = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSurvey = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`);
      if (!res.ok) throw new Error(`Failed to load survey: ${res.status}`);
      const json = await res.json();
      const payload = json.success ? json.data : json;
      setSurvey(payload.survey);
      setQuestions(payload.questions);
      setSections(payload.sections);
    } catch (err) {
      logError(
        { component: 'SurveyPreviewPage', operation: 'loadSurvey' },
        'Failed to load survey',
        err
      );
      setError('Failed to load survey preview.');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Survey not found'}</p>
        <button
          onClick={() => void loadSurvey()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const ungroupedQuestions = questions.filter(q => !q.sectionId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="flex items-center justify-between mb-6">
          <Link
            href={`/admin/surveys/${surveyId}/edit`}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            &larr; Back to editor
          </Link>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Preview</span>
        </nav>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          {survey.description && (
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: survey.description }}
            />
          )}
        </div>

        {sections.length > 0 &&
          sections.map(section => {
            const sectionQuestions = questions.filter(q => q.sectionId === section.id);
            return (
              <div
                key={section.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden border-l-4 border-l-indigo-400"
              >
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {section.title || 'Untitled Section'}
                  </h2>
                  {section.description && (
                    <div
                      className="prose prose-sm max-w-none text-gray-600 mt-1"
                      dangerouslySetInnerHTML={{ __html: section.description }}
                    />
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {sectionQuestions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                      No questions in this section
                    </p>
                  ) : (
                    sectionQuestions.map(q => <PreviewQuestion key={q.id} question={q} />)
                  )}
                </div>
              </div>
            );
          })}

        {ungroupedQuestions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-4 mb-4">
            {sections.length > 0 && (
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ungrouped questions</h3>
            )}
            {ungroupedQuestions.map(q => (
              <PreviewQuestion key={q.id} question={q} />
            ))}
          </div>
        )}

        {questions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">This survey has no questions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewQuestion({ question }: { question: SurveyQuestion }) {
  const meta = getTypeMeta(question.type);
  const Preview = PREVIEW_MAP[question.type];

  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-base font-medium text-gray-900 flex-1">{question.text}</span>
        <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${meta.badgeClass}`}>
          {meta.label}
        </span>
        {question.required && <span className="text-xs text-red-500 font-medium">Required</span>}
      </div>
      <Preview question={question} />
    </div>
  );
}
