'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Send, CheckCircle2, AlertCircle, Star, ArrowLeft } from 'lucide-react';
import type { Survey, SurveyQuestion, SurveySection } from '@entities/survey';
import { logError } from '@shared/lib';
import { apiGet, apiPost, ApiClientError } from '@/shared/api/http-client';

interface SurveyDetail {
  survey: Survey;
  questions: SurveyQuestion[];
  sections: SurveySection[];
}

type AnswerValue = string | string[] | number;
type AnswerMap = Record<string, AnswerValue>;

function QuestionFormField({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (questionId: string, value: AnswerValue) => void;
}) {
  const config = (question.config ?? {}) as Record<string, unknown>;
  const isRequired = question.required;

  if (question.type === 'TEXT') {
    const isParagraph = config.isParagraph === true;
    const charLimit = typeof config.charLimit === 'number' ? config.charLimit : undefined;
    const currentValue = typeof value === 'string' ? value : '';

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        {isParagraph ? (
          <textarea
            value={currentValue}
            onChange={e => onChange(question.id, e.target.value)}
            maxLength={charLimit}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            placeholder="Type your answer..."
          />
        ) : (
          <input
            type="text"
            value={currentValue}
            onChange={e => onChange(question.id, e.target.value)}
            maxLength={charLimit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type your answer..."
          />
        )}
        {charLimit !== undefined && (
          <p className="text-xs text-gray-400 mt-1">
            {currentValue.length}/{charLimit} characters
          </p>
        )}
      </div>
    );
  }

  if (question.type === 'SINGLE_CHOICE') {
    const selected = typeof value === 'string' ? value : '';
    return (
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="space-y-2">
          {question.options.map(option => (
            <label
              key={option}
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                selected === option
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={selected === option}
                onChange={() => onChange(question.id, option)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'MULTIPLE_CHOICE') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option: string) => {
      const next = selected.includes(option)
        ? selected.filter(o => o !== option)
        : [...selected, option];
      onChange(question.id, next);
    };

    return (
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="space-y-2">
          {question.options.map(option => (
            <label
              key={option}
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(option)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'RATING') {
    const maxStars = typeof config.maxStars === 'number' ? config.maxStars : 5;
    const current = typeof value === 'number' ? value : 0;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex gap-1">
          {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(question.id, star)}
              className="p-0.5 transition-colors"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={`w-7 h-7 ${
                  star <= current ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {current > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {current} / {maxStars}
          </p>
        )}
      </div>
    );
  }

  if (question.type === 'YES_NO') {
    const selected = typeof value === 'string' ? value : '';
    return (
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="flex gap-3">
          {['Yes', 'No'].map(option => (
            <label
              key={option}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                selected === option
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={selected === option}
                onChange={() => onChange(question.id, option)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'LINEAR_SCALE') {
    const minValue = typeof config.minValue === 'number' ? config.minValue : 1;
    const maxValue = typeof config.maxValue === 'number' ? config.maxValue : 10;
    const minLabel = typeof config.minLabel === 'string' ? config.minLabel : null;
    const maxLabel = typeof config.maxLabel === 'string' ? config.maxLabel : null;
    const current = typeof value === 'number' ? value : 0;
    const range = Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i);

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {question.text}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {range.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(question.id, n)}
              className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${
                current === n
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {(minLabel || maxLabel) && (
          <div className="flex justify-between mt-1.5">
            {minLabel && <span className="text-xs text-gray-400">{minLabel}</span>}
            {maxLabel && <span className="text-xs text-gray-400">{maxLabel}</span>}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function SurveyResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SurveyDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSurvey() {
      try {
        const { data } = await apiGet<SurveyDetail>(`/api/surveys/${id}`);
        if (!cancelled) {
          setData(data);
          // Check if survey is active
          if (data.survey?.status !== 'ACTIVE') {
            setError('This survey is no longer accepting responses.');
          }
        }
      } catch (err) {
        logError(
          { component: 'SurveyResponsePage', operation: 'fetchSurvey' },
          'Failed to fetch survey',
          err
        );
        if (!cancelled) {
          if (err instanceof ApiClientError && err.statusCode === 404) {
            setError('Survey not found');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load survey');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSurvey();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async () => {
    if (!data) return;

    // Validate required questions
    const missingRequired = data.questions
      .filter(q => q.required)
      .filter(q => {
        const answer = answers[q.id];
        if (answer === undefined || answer === null) return true;
        if (typeof answer === 'string' && answer.trim() === '') return true;
        if (Array.isArray(answer) && answer.length === 0) return true;
        if (typeof answer === 'number' && answer === 0) return true;
        return false;
      });

    if (missingRequired.length > 0) {
      setSubmitError(`Please answer all required questions (${missingRequired.length} remaining).`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await apiPost(`/api/surveys/${id}/responses`, { answers });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 409) {
        setSubmitError('You have already responded to this survey.');
        return;
      }
      logError(
        { component: 'SurveyResponsePage', operation: 'submitResponse' },
        'Failed to submit response',
        err
      );
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (submitError) setSubmitError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'Survey not found' ? 'Survey Not Found' : 'Error'}
          </h1>
          <p className="text-gray-500 mb-6">{error || 'Survey not found'}</p>
          <Link
            href="/dashboard/services/surveys"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Submitted</h1>
          <p className="text-gray-500 mb-6">
            Thank you for completing the survey. Your responses have been recorded.
          </p>
          <Link
            href="/dashboard/services/surveys"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  const { survey, questions, sections } = data;
  const questionsBySection = new Map<string | null, SurveyQuestion[]>();
  const sectionMap = new Map<string, SurveySection>();

  for (const s of sections) {
    sectionMap.set(s.id, s);
  }

  for (const q of questions) {
    const key = q.sectionId;
    if (!questionsBySection.has(key)) {
      questionsBySection.set(key, []);
    }
    questionsBySection.get(key)!.push(q);
  }

  const orderedGroups: { section: SurveySection | null; questions: SurveyQuestion[] }[] = [];

  // Sections in order
  for (const s of sections) {
    orderedGroups.push({
      section: s,
      questions: questionsBySection.get(s.id) ?? [],
    });
  }

  // Ungrouped questions (no section)
  const ungrouped = questionsBySection.get(null);
  if (ungrouped && ungrouped.length > 0) {
    orderedGroups.push({ section: null, questions: ungrouped });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <Link
          href="/dashboard/services/surveys"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Surveys
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
          </div>
          {survey.description && (
            <p className="text-sm text-gray-500 ml-12">{survey.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {orderedGroups.map((group, gi) => (
            <div
              key={group.section?.id ?? `ungrouped-${gi}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              {group.section && (
                <div className="mb-5 pb-4 border-b border-gray-100">
                  {group.section.title && (
                    <h2 className="text-lg font-semibold text-gray-900">{group.section.title}</h2>
                  )}
                  {group.section.description && (
                    <p className="text-sm text-gray-500 mt-1">{group.section.description}</p>
                  )}
                </div>
              )}

              <div className="space-y-6">
                {group.questions.map(question => (
                  <QuestionFormField
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    onChange={handleAnswerChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        {questions.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {submitError && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {
                  Object.keys(answers).filter(k => {
                    const a = answers[k];
                    if (a === undefined || a === null) return false;
                    if (typeof a === 'string' && a.trim() === '') return false;
                    if (Array.isArray(a) && a.length === 0) return false;
                    if (typeof a === 'number' && a === 0) return false;
                    return true;
                  }).length
                }{' '}
                of {questions.length} answered
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
