'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
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
import { QuestionList } from './QuestionList';

interface SurveyEditorProps {
  surveyId: string;
}

interface ReorderItem {
  id: string;
  order: number;
  sectionId?: string | null;
}

export function SurveyEditor({ surveyId }: SurveyEditorProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragKind, setActiveDragKind] = useState<'section' | 'question' | null>(null);

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

  /**
   * Persist a new order for questions. Optimistic: update local state
   * first, then call the reorder endpoint. Failure logs and leaves the
   * server state authoritative on the next load.
   */
  const persistQuestionOrder = useCallback(
    async (items: ReorderItem[]) => {
      // Optimistic local update
      setQuestions(prev => {
        const map = new Map(items.map(i => [i.id, i]));
        return prev.map(q => {
          const item = map.get(q.id);
          if (!item) return q;
          return {
            ...q,
            order: item.order,
            sectionId: item.sectionId !== undefined ? item.sectionId : q.sectionId,
          };
        });
      });
      try {
        const res = await fetch(`/api/surveys/${surveyId}/questions/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error(`Reorder failed: ${res.status}`);
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'reorderQuestions' },
          'Failed to reorder questions',
          err
        );
      }
    },
    [surveyId]
  );

  /**
   * Persist a new order for sections. Same optimistic-first pattern.
   */
  const persistSectionOrder = useCallback(
    async (items: { id: string; order: number }[]) => {
      setSections(prev => {
        const map = new Map(items.map(i => [i.id, i.order]));
        return prev.map(s => (map.has(s.id) ? { ...s, order: map.get(s.id)! } : s));
      });
      try {
        const res = await fetch(`/api/surveys/${surveyId}/sections/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error(`Section reorder failed: ${res.status}`);
      } catch (err) {
        logError(
          { component: 'SurveyEditor', operation: 'reorderSections' },
          'Failed to reorder sections',
          err
        );
      }
    },
    [surveyId]
  );

  // DnD sensors for the section-level context
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setActiveDragKind('section');
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragKind(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({
      id: s.id,
      order: idx,
    }));
    void persistSectionOrder(reordered);
  };

  const handleSectionDragCancel = () => {
    setActiveDragId(null);
    setActiveDragKind(null);
  };

  const ungroupedQuestions = useMemo(() => questions.filter(q => !q.sectionId), [questions]);

  const activeSection =
    activeDragKind === 'section' ? (sections.find(s => s.id === activeDragId) ?? null) : null;

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
            <EmptySurvey onAdd={type => void onAddQuestion(type)} />
          ) : (
            <QuestionList
              questions={ungroupedQuestions}
              sectionIds={[]}
              currentSectionId={null}
              onUpdateQuestion={onUpdateQuestion}
              onDeleteQuestion={onDeleteQuestion}
              onReorder={items => void persistQuestionOrder(items)}
            />
          )
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleSectionDragStart}
            onDragEnd={handleSectionDragEnd}
            onDragCancel={handleSectionDragCancel}
          >
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
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
                  sortable
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeSection ? (
                <div className="opacity-90 shadow-2xl">
                  <SectionBlock
                    section={activeSection}
                    questions={questions.filter(q => q.sectionId === activeSection.id)}
                    onUpdateSection={() => {}}
                    onDeleteSection={() => {}}
                    onAddQuestion={() => {}}
                    onUpdateQuestion={() => {}}
                    onDeleteQuestion={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>

            {ungroupedQuestions.length > 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Ungrouped questions</h3>
                <QuestionList
                  questions={ungroupedQuestions}
                  sectionIds={sections.map(s => s.id)}
                  currentSectionId={null}
                  onUpdateQuestion={onUpdateQuestion}
                  onDeleteQuestion={onDeleteQuestion}
                  onReorder={items => void persistQuestionOrder(items)}
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
          </DndContext>
        )}
      </div>

      <BlockPalette onSelect={type => void onAddQuestion(type)} />
    </div>
  );
}

function EmptySurvey({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
      <i className="fas fa-poll-h text-4xl text-gray-300 mb-3"></i>
      <p className="text-gray-500 mb-1 font-medium">This survey has no questions yet</p>
      <p className="text-sm text-gray-400 mb-4">
        Click the + button below to add your first question
      </p>
      <div className="flex justify-center">
        <BlockPalette onSelect={onAdd} />
      </div>
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
