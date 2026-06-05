'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from '@shared/ui';
import { trpc } from '@api/trpc/client';
import { authClient } from '@api/auth-client';
import { toast } from 'sonner';

// ──────────────────────────────────────────
// Type badge helpers
// ──────────────────────────────────────────

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

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  ENDED: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ──────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────

function DetailSkeleton() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="h-64 bg-gray-200 rounded-lg animate-pulse mb-8" />
      <div className="space-y-4">
        <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────
// Competition Detail Content
// ──────────────────────────────────────────

function CompetitionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const {
    data: competition,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.competitions.getCompetitionDetail.useQuery({ id }, { enabled: !!id });

  // Fetch winners for ENDED competitions
  const { data: winners } = trpc.competitions.listWinners.useQuery(
    { competitionId: id },
    { enabled: !!id && competition?.status === 'ENDED' }
  );

  // Mutations
  const joinMutation = trpc.competitions.joinCompetition.useMutation({
    onSuccess: () => {
      toast.success('You have joined the competition!');
      utils.competitions.getCompetitionDetail.invalidate({ id });
      utils.competitions.listWinners.invalidate({ competitionId: id });
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const submitMutation = trpc.competitions.submitPhotoEntry.useMutation({
    onSuccess: () => {
      toast.success('Entry submitted successfully!');
      setShowSubmitForm(false);
      utils.competitions.getCompetitionDetail.invalidate({ id });
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  // Local state
  const [showRules, setShowRules] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitText, setSubmitText] = useState('');
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  // ── Loading state ──
  if (isLoading) return <DetailSkeleton />;

  // ── Error state ──
  if (isError) {
    const isNotFound = error?.message?.toLowerCase().includes('not found');
    return (
      <main className="container mx-auto px-4 py-12 max-w-4xl text-center">
        {isNotFound ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Competition Not Found</h1>
            <p className="text-gray-500 mb-6">
              This competition doesn&apos;t exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/competition')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Back to Competitions
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-4">Failed to load competition details.</p>
            <button
              onClick={() => refetch()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </>
        )}
      </main>
    );
  }

  if (!competition) return <DetailSkeleton />;

  const isWithinDateRange =
    new Date() >= new Date(competition.startDate) && new Date() <= new Date(competition.endDate);
  const canParticipate = competition.status === 'ACTIVE' && isWithinDateRange && !!session;
  const hasJoined = !!competition.currentUserEntry;
  const entryStatus = competition.currentUserEntry?.status;

  // ── Render ──
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Hero section */}
      {competition.image && (
        <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden mb-8">
          <img
            src={competition.image}
            alt={competition.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Title + badges */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span
          className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${typeBadgeColors[competition.type] || 'bg-gray-100 text-gray-700'}`}
        >
          {typeLabels[competition.type] || competition.type}
        </span>
        <span
          className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${statusColors[competition.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {competition.status}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{competition.title}</h1>

      {competition.description && (
        <p className="text-lg text-gray-600 mb-8 whitespace-pre-wrap">{competition.description}</p>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <InfoCard label="Start Date" value={formatDate(competition.startDate)} />
        <InfoCard label="End Date" value={formatDate(competition.endDate)} />
        <InfoCard label="Participants" value={`${competition.participantCount || 0}`} />
        <InfoCard
          label="Max Participants"
          value={competition.maxParticipants ? String(competition.maxParticipants) : 'Unlimited'}
        />
        {competition.prizeInfo && (
          <InfoCard label="Prize" value={competition.prizeInfo} span={true} />
        )}
      </div>

      {/* Rules collapsible */}
      {competition.rules && (
        <div className="mb-8">
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showRules ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Rules &amp; Guidelines
          </button>
          {showRules && (
            <div className="mt-3 bg-gray-50 rounded-lg p-4 text-gray-700 text-sm whitespace-pre-wrap">
              {competition.rules}
            </div>
          )}
        </div>
      )}

      {/* Action section */}
      <div className="mb-10">
        {competition.status === 'ACTIVE' && (
          <>
            {competition.type === 'RAFFLE' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                {!session ? (
                  <p className="text-gray-500">Please sign in to join this competition.</p>
                ) : hasJoined ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">You&apos;re in the draw!</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Winners will be drawn at random when the competition ends. Good luck!
                    </p>
                  </div>
                ) : joinMutation.isPending ? (
                  <button
                    disabled
                    className="bg-indigo-400 text-white py-2.5 px-6 rounded-lg font-medium cursor-not-allowed"
                  >
                    Joining…
                  </button>
                ) : (
                  <button
                    onClick={() => joinMutation.mutate({ competitionId: competition.id })}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors"
                  >
                    Join Competition
                  </button>
                )}
              </div>
            )}

            {competition.type === 'PHOTO' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                {!session ? (
                  <p className="text-gray-500">Please sign in to submit an entry.</p>
                ) : hasJoined && competition.currentUserEntry ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Entry submitted!</span>
                    </div>
                    {competition.currentUserEntry.submissionUrl && (
                      <div className="mt-2">
                        <img
                          src={competition.currentUserEntry.submissionUrl}
                          alt="Your submission"
                          className="max-w-xs mx-auto rounded-lg shadow-sm border border-gray-100"
                        />
                      </div>
                    )}
                    {competition.currentUserEntry.submissionText && (
                      <p className="text-sm text-gray-600 max-w-md">
                        &ldquo;{competition.currentUserEntry.submissionText}&rdquo;
                      </p>
                    )}
                  </div>
                ) : submitMutation.isPending ? (
                  <button
                    disabled
                    className="bg-indigo-400 text-white py-2.5 px-6 rounded-lg font-medium cursor-not-allowed"
                  >
                    Submitting…
                  </button>
                ) : !showSubmitForm ? (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors"
                  >
                    Submit Entry
                  </button>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Submit Your Entry</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                        Photo URL *
                      </label>
                      <input
                        type="url"
                        value={submitUrl}
                        onChange={e => setSubmitUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={submitText}
                        onChange={e => setSubmitText(e.target.value)}
                        placeholder="Tell us about your entry…"
                        rows={3}
                        maxLength={2000}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setShowSubmitForm(false);
                          setSubmitUrl('');
                          setSubmitText('');
                        }}
                        className="text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!submitUrl) {
                            toast.error('Photo URL is required');
                            return;
                          }
                          submitMutation.mutate({
                            competitionId: competition.id,
                            submissionUrl: submitUrl,
                            submissionText: submitText || undefined,
                          });
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg text-sm font-medium transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {competition.type === 'SCORE' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                {!session ? (
                  <p className="text-gray-500">Please sign in to participate.</p>
                ) : hasJoined ? (
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">You&apos;re registered!</span>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    This competition is score-based — participants are evaluated by judges.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {competition.status === 'ENDED' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-800 text-sm">
            This competition has ended.
          </div>
        )}

        {competition.status === 'CANCELLED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-800 text-sm">
            This competition has been cancelled.
          </div>
        )}
      </div>

      {/* Participants section */}
      {competition.participantCount > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Participants ({competition.participantCount})
          </h2>
          {competition.topParticipants && competition.topParticipants.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {(showAllParticipants
                ? competition.topParticipants
                : competition.topParticipants.slice(0, 20)
              ).map(p => (
                <div key={p.userId} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 truncate max-w-[80px]">{p.name}</span>
                </div>
              ))}
              {competition.topParticipants.length > 20 && !showAllParticipants && (
                <button
                  onClick={() => setShowAllParticipants(true)}
                  className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors self-center"
                >
                  Show All ({competition.topParticipants.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Winners gallery */}
      {competition.status === 'ENDED' && winners && winners.length > 0 && (
        <div className="mb-10">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-6">
            <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Winners
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {winners
                .filter(w => w.rank === 'WINNER')
                .map(w => (
                  <div
                    key={w.userId}
                    className="bg-white rounded-lg shadow-sm border border-amber-100 p-4 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {w.avatar ? (
                        <img src={w.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-amber-100 flex items-center justify-center text-lg font-bold text-amber-600">
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{w.name}</p>
                      {w.prize && <p className="text-sm text-amber-600">{w.prize}</p>}
                      <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                        Winner
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Runner-ups */}
            {winners.filter(w => w.rank === 'RUNNER_UP').length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Runner Ups</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {winners
                    .filter(w => w.rank === 'RUNNER_UP')
                    .map(w => (
                      <div
                        key={w.userId}
                        className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {w.avatar ? (
                            <img src={w.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                              {w.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{w.name}</p>
                          {w.prize && <p className="text-xs text-gray-500">{w.prize}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winners gallery empty state */}
      {competition.status === 'ENDED' && (!winners || winners.length === 0) && (
        <div className="mb-10">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
              Winners
            </h2>
            <p className="text-gray-500">
              Winners haven&apos;t been announced yet. Check back soon!
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────
// InfoCard sub-component
// ──────────────────────────────────────────

function InfoCard({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${span ? 'col-span-2 md:col-span-4' : ''}`}
    >
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

// ──────────────────────────────────────────
// Page export
// ──────────────────────────────────────────

export default function CompetitionDetailPage() {
  return (
    <ErrorBoundary>
      <CompetitionDetailContent />
    </ErrorBoundary>
  );
}
