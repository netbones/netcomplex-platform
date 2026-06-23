'use client';

import { ErrorBoundary } from '@shared/ui';
import { trpc } from '@api/client';
import { useRouter } from 'next/navigation';

const typeBadgeColors: Record<string, string> = {
  RAFFLE: 'bg-purple-100 text-purple-800',
  PHOTO: 'bg-blue-100 text-blue-800',
  SCORE: 'bg-green-100 text-green-800',
};

const typeLabels: Record<string, string> = {
  RAFFLE: 'Raffle Draw',
  PHOTO: 'Photo Contest',
  SCORE: 'Score Based',
};

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-ZA', opts);
  const e = new Date(end).toLocaleDateString('en-ZA', opts);
  return `${s} – ${e}`;
}

function CompetitionCard({
  competition,
  onClick,
}: {
  competition: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    startDate: string;
    endDate: string;
    prizeInfo: string | null;
    participantCount: number;
    topParticipants?: { userId: string; name: string; avatar: string | null }[];
  };
  onClick: () => void;
}) {
  const descSnippet = competition.description
    ? competition.description.length > 120
      ? competition.description.slice(0, 120) + '…'
      : competition.description
    : null;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-left w-full p-5 flex flex-col gap-3"
    >
      {/* Top badges */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeBadgeColors[competition.type] || 'bg-gray-100 text-gray-700'}`}
        >
          {typeLabels[competition.type] || competition.type}
        </span>
        <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          Active
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 leading-tight">{competition.title}</h3>

      {/* Description snippet */}
      {descSnippet && <p className="text-sm text-gray-500 line-clamp-2">{descSnippet}</p>}

      {/* Date range */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{formatDateRange(competition.startDate, competition.endDate)}</span>
      </div>

      {/* Prize info */}
      {competition.prizeInfo && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 3h14v3a7 7 0 01-14 0V3zm7 7v4m0 0l-3 3m3-3l3 3"
            />
          </svg>
          <span className="font-medium">Prize: {competition.prizeInfo}</span>
        </div>
      )}

      {/* Bottom row: participant avatars + count */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center">
          {competition.topParticipants && competition.topParticipants.length > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {competition.topParticipants.slice(0, 5).map((p, i) => (
                  <div
                    key={p.userId}
                    className={`relative w-7 h-7 rounded-full border-2 border-white ${i === 0 ? 'z-10' : i === 1 ? 'z-9' : i === 2 ? 'z-8' : i === 3 ? 'z-7' : 'z-6'}`}
                    style={{ zIndex: 5 - i }}
                  >
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {competition.participantCount > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500 -ml-2">
                    +{competition.participantCount - 5}
                  </div>
                )}
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {competition.participantCount}{' '}
                {competition.participantCount === 1 ? 'participant' : 'participants'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">0 participants</span>
          )}
        </div>
      </div>
    </button>
  );
}

function CompetitionGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompetitionContent() {
  const {
    data: competitions,
    isLoading,
    isError,
    refetch,
  } = trpc.competitions.listPublicCompetitions.useQuery(undefined, {
    staleTime: 30_000,
  });
  const router = useRouter();

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-72 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <CompetitionGridSkeleton />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Unable to load competitions. Please try again later.</p>
          <button
            onClick={() => refetch()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3h14v3a7 7 0 01-14 0V3zm7 7v4m0 0l-3 3m3-3l3 3"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Competitions</h1>
          <p className="text-gray-500">
            There are no active competitions at the moment. Check back soon!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Competitions</h1>
        <p className="text-gray-500">Join our community competitions!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map(comp => (
          <CompetitionCard
            key={comp.id}
            competition={comp}
            onClick={() => router.push(`/competition/${comp.id}`)}
          />
        ))}
      </div>
    </main>
  );
}

export default function CompetitionPage() {
  return (
    <ErrorBoundary>
      <CompetitionContent />
    </ErrorBoundary>
  );
}
