'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { logError } from '@shared/lib';

interface QuestionResult {
  id: string;
  text: string;
  type: string;
  options: string[];
  responses: {
    total: number;
    distribution?: Record<string, number>;
    texts?: string[];
    average?: number;
  };
}

interface SurveyResponseData {
  survey: {
    id: string;
    title: string;
    status: string;
    type: string;
  };
  totalResponses: number;
  questions: QuestionResult[];
}

function BarChart({
  distribution,
  options,
}: {
  distribution: Record<string, number>;
  options: string[];
}) {
  const maxCount = Math.max(...Object.values(distribution), 1);

  const labels = options.length > 0 ? options : Object.keys(distribution);

  return (
    <div className="space-y-2">
      {labels.map(label => {
        const count = distribution[label] ?? 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 min-w-[120px] truncate" title={label}>
              {label}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs text-gray-600">
                {count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingResult({
  average,
  distribution,
}: {
  average: number;
  distribution: Record<string, number>;
}) {
  const fullStars = Math.floor(average);
  const hasHalf = average - fullStars >= 0.3 && average - fullStars < 0.8;
  const totalStars = 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-gray-900">{average.toFixed(1)}</span>
        <span className="text-sm text-gray-500">/ 5</span>
        <div className="flex gap-0.5 ml-2">
          {Array.from({ length: totalStars }).map((_, i) => {
            if (i < fullStars) {
              return <i key={i} className="fas fa-star text-yellow-400 text-lg" />;
            }
            if (i === fullStars && hasHalf) {
              return <i key={i} className="fas fa-star-half-alt text-yellow-400 text-lg" />;
            }
            return <i key={i} className="far fa-star text-gray-300 text-lg" />;
          })}
        </div>
      </div>
      <BarChart distribution={distribution} options={['1', '2', '3', '4', '5']} />
    </div>
  );
}

function TextResponses({ texts }: { texts: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayTexts = showAll ? texts : texts.slice(0, 20);

  return (
    <div className="space-y-2">
      {displayTexts.map((text, idx) => (
        <div
          key={idx}
          className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border-l-4 border-indigo-400"
        >
          {text}
        </div>
      ))}
      {texts.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          {showAll ? 'Show less' : `Show all ${texts.length} responses`}
        </button>
      )}
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionResult }) {
  const typeLabels: Record<string, string> = {
    SINGLE_CHOICE: 'Single Choice',
    MULTIPLE_CHOICE: 'Multiple Choice',
    YES_NO: 'Yes / No',
    RATING: 'Rating',
    TEXT: 'Open Text',
  };

  const typeColors: Record<string, string> = {
    SINGLE_CHOICE: 'bg-blue-100 text-blue-800',
    MULTIPLE_CHOICE: 'bg-purple-100 text-purple-800',
    YES_NO: 'bg-green-100 text-green-800',
    RATING: 'bg-yellow-100 text-yellow-800',
    TEXT: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{question.text}</h3>
        <span
          className={`px-2 py-1 text-xs rounded-full ${typeColors[question.type] || 'bg-gray-100'}`}
        >
          {typeLabels[question.type] || question.type}
        </span>
      </div>

      {question.responses.total === 0 ? (
        <p className="text-sm text-gray-500 italic">No responses yet</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {question.responses.total} response{question.responses.total !== 1 ? 's' : ''}
          </p>

          {(question.type === 'SINGLE_CHOICE' ||
            question.type === 'MULTIPLE_CHOICE' ||
            question.type === 'YES_NO') &&
            question.responses.distribution && (
              <BarChart distribution={question.responses.distribution} options={question.options} />
            )}

          {question.type === 'RATING' &&
            question.responses.average !== undefined &&
            question.responses.distribution && (
              <RatingResult
                average={question.responses.average}
                distribution={question.responses.distribution}
              />
            )}

          {question.type === 'TEXT' && question.responses.texts && (
            <TextResponses texts={question.responses.texts} />
          )}
        </>
      )}
    </div>
  );
}

export default function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<SurveyResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setSurveyId(p.id));
  }, [params]);

  useEffect(() => {
    if (!surveyId) return;

    async function fetchResults() {
      try {
        const response = await fetch(`/api/surveys/${surveyId}/responses`);
        if (!response.ok) {
          throw new Error(`Failed to fetch results: ${response.status}`);
        }
        const result = await response.json();
        setData(result.success ? result.data : result);
      } catch (err) {
        logError(
          { component: 'SurveyResultsPage', operation: 'fetchResults' },
          'Failed to fetch survey results',
          err
        );
        setError('Failed to load survey results');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [surveyId]);

  const handleRetry = () => {
    if (!surveyId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/surveys/${surveyId}/responses`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch results: ${res.status}`);
        return res.json();
      })
      .then(result => {
        setData(result.success ? result.data : result);
        setLoading(false);
      })
      .catch(err => {
        logError(
          { component: 'SurveyResultsPage', operation: 'retryFetch' },
          'Failed to retry fetch survey results',
          err
        );
        setError('Failed to load survey results');
        setLoading(false);
      });
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Surveys', href: '/admin/surveys' },
          { label: data?.survey.title || 'Results' },
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {data?.survey.title || 'Survey Results'}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`px-2 py-1 text-xs rounded-full ${statusColors[data?.survey.status || ''] || 'bg-gray-100'}`}
            >
              {data?.survey.status || ''}
            </span>
            <span className="text-sm text-gray-500">
              {data?.totalResponses ?? 0} total response{data?.totalResponses !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.survey.status === 'DRAFT' && (
            <Link
              href={`/admin/surveys/${surveyId}/edit`}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Edit Survey
            </Link>
          )}
          <Link
            href="/admin/surveys"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            ← Back to Surveys
          </Link>
        </div>
      </div>

      {loading ? (
        <ErrorBoundary>
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </ErrorBoundary>
      ) : error ? (
        <ErrorBoundary>
          <div className="text-center py-12">
            <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-4"></i>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </ErrorBoundary>
      ) : !data || data.questions.length === 0 ? (
        <ErrorBoundary>
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <i className="fas fa-poll text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No questions in this survey yet</p>
          </div>
        </ErrorBoundary>
      ) : data.totalResponses === 0 ? (
        <ErrorBoundary>
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
            <p className="text-lg text-gray-600 mb-2">No responses yet</p>
            <p className="text-sm text-gray-500">
              Responses will appear here once people start answering the survey.
            </p>
          </div>
        </ErrorBoundary>
      ) : (
        <div className="space-y-6">
          {data.questions.map(question => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}
