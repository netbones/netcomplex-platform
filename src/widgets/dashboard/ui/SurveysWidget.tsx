'use client';

import Link from 'next/link';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';
import { logError } from '@shared/lib';
import { trpc } from '@api/client';

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-800',
};

export function SurveysWidget() {
  const { data, isLoading, error, refetch } = trpc.surveys.listSurveys.useQuery(
    { status: 'ACTIVE' },
    { staleTime: 60_000 },
  );
  const surveys = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    logError(
      { component: 'SurveysWidget', operation: 'fetchActive' },
      'Failed to fetch surveys',
      error
    );
    return (
      <div className="text-center py-6">
        <FileText className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">Failed to load surveys</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No active surveys</p>
        <p className="text-xs text-gray-400 mt-1">Check back later for new surveys</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {surveys.map(survey => (
        <Link
          key={survey.id}
          href={`/surveys/${survey.id}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                {survey.title}
              </p>
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${statusBadge[survey.status] || 'bg-gray-100 text-gray-800'}`}
              >
                {survey.status}
              </span>
            </div>
            {survey.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{survey.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {survey.questionCount} {survey.questionCount === 1 ? 'question' : 'questions'}
              {survey.responseCount > 0 &&
                ` · ${survey.responseCount} ${survey.responseCount === 1 ? 'response' : 'responses'}`}
            </p>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
        </Link>
      ))}

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{surveys.length} active</span>
        <Link
          href="/dashboard/services/surveys"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View all surveys →
        </Link>
      </div>
    </div>
  );
}
