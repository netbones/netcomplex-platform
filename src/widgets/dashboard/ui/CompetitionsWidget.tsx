'use client';

import Link from 'next/link';
import { Trophy, ArrowRight, Users, Loader2 } from 'lucide-react';
import { logError } from '@shared/lib';
import { trpc } from '@api/client';

const typeBadge: Record<string, string> = {
  RAFFLE: 'bg-purple-100 text-purple-800',
  PHOTO: 'bg-blue-100 text-blue-800',
  SCORE: 'bg-orange-100 text-orange-800',
};

const typeLabel: Record<string, string> = {
  RAFFLE: 'Raffle',
  PHOTO: 'Photo',
  SCORE: 'Scored',
};

function timeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;
  return 'Ending soon';
}

export function CompetitionsWidget() {
  const { data, isLoading, error, refetch } = trpc.competitions.listPublicCompetitions.useQuery(
    undefined,
    { staleTime: 60_000 },
  );
  const competitions = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    logError(
      { component: 'CompetitionsWidget', operation: 'fetchActive' },
      'Failed to fetch competitions',
      error
    );
    return (
      <div className="text-center py-6">
        <Trophy className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">Failed to load competitions</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No active competitions</p>
        <p className="text-xs text-gray-400 mt-1">Check back later for new competitions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {competitions.map(comp => (
        <Link
          key={comp.id}
          href={`/competition/${comp.id}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                {comp.title}
              </p>
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${typeBadge[comp.type] || 'bg-gray-100 text-gray-800'}`}
              >
                {typeLabel[comp.type] || comp.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>{timeLeft(comp.endDate)}</span>
              {comp.entryCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {comp.entryCount}
                </span>
              )}
            </div>
            {comp.prizeInfo && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{comp.prizeInfo}</p>
            )}
          </div>

          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 shrink-0 transition-colors" />
        </Link>
      ))}

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{competitions.length} active</span>
        <Link
          href="/competition"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View all competitions →
        </Link>
      </div>
    </div>
  );
}
