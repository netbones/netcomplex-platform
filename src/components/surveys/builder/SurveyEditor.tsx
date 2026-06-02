'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '@shared/ui';
import { logError } from '@shared/lib';
import { Plus } from 'lucide-react';
import type {
  Survey,
  SurveyDetailResponse,
  SurveyQuestion,
  SurveySection,
  QuestionType,
} from './survey-types';
import { SurveyEditorHeader } from './SurveyEditorHeader';
import { QuestionBlock } from './QuestionBlock';
import { SectionBlock } from './SectionBlock';
import { BlockPalette } from './BlockPalette';

interface SurveyEditorProps {
  surveyId: string;
}

export function SurveyEditor({ surveyId }: SurveyEditorProps) {
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
      if (!res.ok) {
        throw new Error(`Failed to load survey: ${res.status}`);
      }
      const json = await res.json();
      const payload: SurveyDetailResponse = json.success ? json.data : json;
      setSurvey(payload.survey);
      setQuestions(payload.questions);
      setSections(payload.sections);
    } catch (err) {
      logError(
        { component: 'SurveyEditor', operation: 'loadSurvey' },
        'Failed to load survey',
        err
      );
      setError('Failed to load survey. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  const onUpdateSurvey = useCallback(
    async (changes: Partial<Pick<Survey, 'title' | 'description' | 'status'>>) => {
      if (!survey) return;
      const previous = survey;
      setSurvey({ ...survey, ...changes });
      try {
        const res = await fetch(`/api/surveys/${surveyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        const json = await res.json();
        const updated: Survey = json.success ? json.data : json;
        setSurvey(updated);
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'updateSurvey' },
          'Failed to update survey',
          err
        );
        setSurvey(previous);
      }
    },
    [survey, surveyId]
  );

  const onAddQuestion = useCallback(
    async (type: QuestionType, sectionId: string | null = null) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: SurveyQuestion = {
        id: tempId,
        tenantId: survey?.tenantId ?? '',
        surveyId,
        sectionId,
        text: getDefaultTextForType(type),
        type,
        options: type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' ? ['Option 1'] : [],
        required: false,
        order: questions.length,
        config: getDefaultConfigForType(type),
      };
      setQuestions(prev => [...prev, optimistic]);

      try {
        const res = await fetch(`/api/surveys/${surveyId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            text: optimistic.text,
            options: optimistic.options,
            required: false,
            sectionId,
            config: optimistic.config,
          }),
        });
        if (!res.ok) throw new Error(`Create failed: ${res.status}`);
        const json = await res.json();
        const created: SurveyQuestion = json.success ? json.data : json;
        setQuestions(prev => prev.map(q => (q.id === tempId ? created : q)));
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'addQuestion' },
          'Failed to add question',
          err
        );
        setQuestions(prev => prev.filter(q => q.id !== tempId));
      }
    },
    [questions.length, survey, surveyId]
  );

  const onUpdateQuestion = useCallback(
    async (questionId: string, changes: Partial<SurveyQuestion>) => {
      const previous = questions.find(q => q.id === questionId);
      if (!previous) return;

      setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...changes } : q)));

      try {
        const res = await fetch(`/api/surveys/${surveyId}/questions/${questionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        const json = await res.json();
        const updated: SurveyQuestion = json.success ? json.data : json;
        setQuestions(prev => prev.map(q => (q.id === questionId ? updated : q)));
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'updateQuestion' },
          'Failed to update question',
          err
        );
        setQuestions(prev => prev.map(q => (q.id === questionId ? previous : q)));
      }
    },
    [questions, surveyId]
  );

  const onDeleteQuestion = useCallback(
    async (questionId: string) => {
      const previous = questions;
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      try {
        const res = await fetch(`/api/surveys/${surveyId}/questions/${questionId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'deleteQuestion' },
          'Failed to delete question',
          err
        );
        setQuestions(previous);
      }
    },
    [questions, surveyId]
  );

  const onAddSection = useCallback(async () => {
    const tempId = `temp-section-${Date.now()}`;
    const optimistic: SurveySection = {
      id: tempId,
      tenantId: survey?.tenantId ?? '',
      surveyId,
      title: 'Untitled section',
      description: null,
      image: null,
      order: sections.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSections(prev => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: optimistic.title, description: null }),
      });
      if (!res.ok) throw new Error(`Section create failed: ${res.status}`);
      const json = await res.json();
      const created: SurveySection = json.success ? json.data : json;
      setSections(prev => prev.map(s => (s.id === tempId ? created : s)));
    } catch (err) {
      logError(
        { component: 'SurveyEditor', operation: 'addSection' },
        'Failed to add section',
        err
      );
      setSections(prev => prev.filter(s => s.id !== tempId));
    }
  }, [sections.length, survey, surveyId]);

  const onUpdateSection = useCallback(
    async (sectionId: string, changes: Partial<SurveySection>) => {
      const previous = sections.find(s => s.id === sectionId);
      if (!previous) return;
      setSections(prev => prev.map(s => (s.id === sectionId ? { ...s, ...changes } : s)));
      try {
        const res = await fetch(`/api/surveys/${surveyId}/sections/${sectionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error(`Section update failed: ${res.status}`);
        const json = await res.json();
        const updated: SurveySection = json.success ? json.data : json;
        setSections(prev => prev.map(s => (s.id === sectionId ? updated : s)));
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'updateSection' },
          'Failed to update section',
          err
        );
        setSections(prev => prev.map(s => (s.id === sectionId ? previous : s)));
      }
    },
    [sections, surveyId]
  );

  const onDeleteSection = useCallback(
    async (sectionId: string) => {
      const previousSections = sections;
      const previousQuestions = questions;
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setQuestions(prev =>
        prev.map(q => (q.sectionId === sectionId ? { ...q, sectionId: null } : q))
      );
      try {
        const res = await fetch(`/api/surveys/${surveyId}/sections/${sectionId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Section delete failed: ${res.status}`);
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'deleteSection' },
          'Failed to delete section',
          err
        );
        setSections(previousSections);
        setQuestions(previousQuestions);
      }
    },
    [questions, sections, surveyId]
  );

  const ungroupedQuestions = useMemo(() => questions.filter(q => !q.sectionId), [questions]);

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
        <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-4"></i>
        <p className="text-gray-600 mb-4">{error || 'Survey not found'}</p>
        <button
          onClick={() => void loadSurvey()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SurveyEditorHeader survey={survey} onUpdateSurvey={onUpdateSurvey} />

      <div className="space-y-4">
        {sections.length === 0 ? (
          ungroupedQuestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <i className="fas fa-poll-h text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 mb-1">This survey is empty</p>
              <p className="text-sm text-gray-400">
                Click the + button below to add your first question
              </p>
            </div>
          ) : (
            <QuestionsGroup
              questions={ungroupedQuestions}
              onUpdateQuestion={onUpdateQuestion}
              onDeleteQuestion={onDeleteQuestion}
            />
          )
        ) : (
          <>
            {sections.map(section => (
              <SectionBlock
                key={section.id}
                section={section}
                questions={questions.filter(q => q.sectionId === section.id)}
                onUpdateSection={onUpdateSection}
                onDeleteSection={onDeleteSection}
                onAddQuestion={type => void onAddQuestion(type, section.id)}
                onUpdateQuestion={onUpdateQuestion}
                onDeleteQuestion={onDeleteQuestion}
              />
            ))}

            {ungroupedQuestions.length > 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Ungrouped questions</h3>
                <QuestionsGroup
                  questions={ungroupedQuestions}
                  onUpdateQuestion={onUpdateQuestion}
                  onDeleteQuestion={onDeleteQuestion}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => void onAddSection()}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add section
            </button>
          </>
        )}
      </div>

      <BlockPalette onSelect={type => void onAddQuestion(type)} />
    </div>
  );
}

function QuestionsGroup({
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
}: {
  questions: SurveyQuestion[];
  onUpdateQuestion: (questionId: string, changes: Partial<SurveyQuestion>) => void;
  onDeleteQuestion: (questionId: string) => void;
}) {
  return (
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
  );
}

function getDefaultTextForType(type: QuestionType): string {
  switch (type) {
    case 'SINGLE_CHOICE':
      return 'Untitled multiple choice question';
    case 'MULTIPLE_CHOICE':
      return 'Untitled checkbox question';
    case 'TEXT':
      return 'Untitled text question';
    case 'RATING':
      return 'How would you rate this?';
    case 'YES_NO':
      return 'Yes or no?';
    case 'LINEAR_SCALE':
      return 'Rate on a scale';
  }
}

function getDefaultConfigForType(type: QuestionType): Record<string, unknown> {
  switch (type) {
    case 'SINGLE_CHOICE':
      return { displayAs: 'radio' };
    case 'TEXT':
      return { isParagraph: false, charLimit: 200 };
    case 'RATING':
      return { maxStars: 5 };
    case 'LINEAR_SCALE':
      return { minValue: 1, maxValue: 5, minLabel: '', maxLabel: '' };
    default:
      return {};
  }
}
