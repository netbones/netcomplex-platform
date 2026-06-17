'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { trpc } from '@api/client';
import type { ParticipantDTO } from '@shared/api';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface Competition {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  entryCount: number;
  image: string | null;
  type: string;
  winnersCount: number;
  maxParticipants: number | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const typeBadgeColors: Record<string, string> = {
  RAFFLE: 'bg-purple-100 text-purple-700',
  PHOTO: 'bg-blue-100 text-blue-700',
  SCORE: 'bg-green-100 text-green-700',
};

const typeLabels: Record<string, string> = {
  RAFFLE: 'Raffle',
  PHOTO: 'Photo',
  SCORE: 'Score',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ──────────────────────────────────────────
// Draw Winners Modal
// ──────────────────────────────────────────

function DrawWinnersModal({
  competitionId,
  winnersCount,
  onClose,
}: {
  competitionId: string;
  winnersCount: number;
  onClose: () => void;
}) {
  const [count, setCount] = useState(winnersCount);
  const utils = trpc.useUtils();

  const drawMutation = trpc.competitions.drawWinners.useMutation({
    onSuccess: data => {
      toast.success(`${data.length} winner(s) drawn!`);
      utils.competitions.listParticipants.invalidate({ competitionId });
      onClose();
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Draw Winners</h3>
        <p className="text-sm text-gray-600 mb-4">Randomly select winners from all participants.</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Winners</label>
        <input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={e => setCount(parseInt(e.target.value) || 1)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => drawMutation.mutate({ competitionId, count })}
            disabled={drawMutation.isPending}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {drawMutation.isPending ? 'Drawing...' : `Draw ${count} Winner${count > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Auto-Select Winners Modal
// ──────────────────────────────────────────

function AutoSelectModal({
  competitionId,
  winnersCount,
  onClose,
}: {
  competitionId: string;
  winnersCount: number;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [scoreThreshold, setScoreThreshold] = useState<number | ''>('');

  const markWinnerMutation = trpc.competitions.markWinner.useMutation({
    onSuccess: () => {
      utils.competitions.listParticipants.invalidate({ competitionId });
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const updateEntryMutation = trpc.competitions.updateEntry.useMutation();

  const handleAutoSelect = async () => {
    const { participants } = await utils.competitions.listParticipants.fetch({ competitionId });

    // Filter to JOINED entries, sort by score descending
    const joinEntries = participants
      .filter(p => p.status === 'JOINED' && p.score != null)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const top = joinEntries.slice(0, winnersCount);

    if (top.length === 0) {
      toast.error('No scored participants to select from');
      return;
    }

    // Mark each as winner
    for (const entry of top) {
      await markWinnerMutation.mutateAsync({ entryId: entry.id });
    }

    toast.success(`${top.length} winner(s) auto-selected!`);
    utils.competitions.listParticipants.invalidate({ competitionId });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto-Select Winners</h3>
        <p className="text-sm text-gray-600 mb-4">
          Automatically select top {winnersCount} participant(s) by highest score.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleAutoSelect}
            disabled={markWinnerMutation.isPending}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {markWinnerMutation.isPending ? 'Selecting...' : `Select Top ${winnersCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Expanded Panel
// ──────────────────────────────────────────

function ParticipantsPanel({ competition }: { competition: Competition }) {
  const { data, isLoading, isError, refetch } = trpc.competitions.listParticipants.useQuery(
    { competitionId: competition.id },
    { enabled: !!competition.id }
  );

  const utils = trpc.useUtils();
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState<number>(0);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [autoSelectModalOpen, setAutoSelectModalOpen] = useState(false);

  const markWinnerMutation = trpc.competitions.markWinner.useMutation({
    onSuccess: () => {
      toast.success('Marked as winner!');
      utils.competitions.listParticipants.invalidate({ competitionId: competition.id });
    },
    onError: err => toast.error(err.message),
  });

  const updateEntryMutation = trpc.competitions.updateEntry.useMutation({
    onSuccess: () => {
      utils.competitions.listParticipants.invalidate({ competitionId: competition.id });
    },
    onError: err => toast.error(err.message),
  });

  const handleScoreSave = (entryId: string) => {
    updateEntryMutation.mutate({ entryId, score: scoreValue });
    setEditingScore(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2" />
        Loading participants...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-2">Failed to load participants</p>
        <button onClick={() => refetch()} className="text-sm text-indigo-600 hover:text-indigo-800">
          Retry
        </button>
      </div>
    );
  }

  const participants = data?.participants || [];

  if (participants.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500">No participants yet</div>;
  }

  // ── RAFFLE Panel ──
  if (competition.type === 'RAFFLE') {
    return (
      <div className="p-4 space-y-4">
        {drawModalOpen && (
          <DrawWinnersModal
            competitionId={competition.id}
            winnersCount={competition.winnersCount}
            onClose={() => setDrawModalOpen(false)}
          />
        )}

        {/* Admin action */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
          {competition.status === 'ENDED' ? (
            <button
              onClick={() => setDrawModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Draw Winners
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">End competition to draw winners</span>
          )}
        </div>

        {/* Participant table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Joined</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {participants.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                        {p.avatar ? (
                          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{formatDate(p.joinedAt)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── PHOTO Panel ──
  if (competition.type === 'PHOTO') {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {participants.map(p => (
            <div key={p.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {p.submissionUrl ? (
                <img
                  src={p.submissionUrl}
                  alt={`${p.name}'s submission`}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  No photo
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <div className="mt-1">
                  <StatusBadge status={p.status} />
                </div>
                {p.status === 'WINNER' && (
                  <div className="mt-2">
                    {p.prize && <p className="text-xs text-amber-600 font-medium">{p.prize}</p>}
                    <button
                      onClick={() => {
                        updateEntryMutation.mutate({ entryId: p.id, status: 'JOINED' });
                      }}
                      className="mt-1 text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove Winner
                    </button>
                  </div>
                )}
                {p.status === 'JOINED' && (
                  <button
                    onClick={() => markWinnerMutation.mutate({ entryId: p.id })}
                    disabled={markWinnerMutation.isPending}
                    className="mt-2 w-full px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs rounded font-medium transition-colors"
                  >
                    Mark as Winner
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SCORE Panel ──
  if (competition.type === 'SCORE') {
    return (
      <div className="p-4 space-y-4">
        {autoSelectModalOpen && (
          <AutoSelectModal
            competitionId={competition.id}
            winnersCount={competition.winnersCount}
            onClose={() => setAutoSelectModalOpen(false)}
          />
        )}

        {/* Admin action */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
          {competition.status === 'ENDED' && (
            <button
              onClick={() => setAutoSelectModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Auto-select Winners
            </button>
          )}
        </div>

        {/* Score table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {participants.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                        {p.avatar ? (
                          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {editingScore === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={scoreValue}
                          onChange={e => setScoreValue(parseFloat(e.target.value) || 0)}
                          onBlur={() => handleScoreSave(p.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleScoreSave(p.id);
                            if (e.key === 'Escape') setEditingScore(null);
                          }}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingScore(p.id);
                          setScoreValue(p.score ?? 0);
                        }}
                        className="text-sm text-gray-900 hover:text-indigo-600 cursor-pointer min-w-[3rem] text-left"
                      >
                        {p.score != null ? p.score : '-'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

// ──────────────────────────────────────────
// Status Badge
// ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    JOINED: 'bg-gray-100 text-gray-600',
    WITHDRAWN: 'bg-red-100 text-red-600',
    WINNER: 'bg-amber-100 text-amber-700',
    RUNNER_UP: 'bg-blue-100 text-blue-600',
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-500'}`}
    >
      {status}
    </span>
  );
}

// ──────────────────────────────────────────
// Main CompetitionList Component
// ──────────────────────────────────────────

export function CompetitionList() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch competitions via REST API (same as before)
  useEffect(() => {
    fetch('/api/competitions')
      .then(res => res.json())
      .then(body => {
        setCompetitions(body?.data ?? body);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/competitions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCompetitions(competitions.filter(c => c.id !== id));
      toast.success('Competition deleted');
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading competitions...</div>;
  }

  if (competitions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No competitions yet. Create your first competition!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-2" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Start Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              End Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entries
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {competitions.map(competition => (
            <Fragment key={competition.id}>
              <tr
                className={`hover:bg-gray-50 cursor-pointer ${expandedId === competition.id ? 'bg-indigo-50' : ''}`}
                onClick={() => setExpandedId(expandedId === competition.id ? null : competition.id)}
              >
                <td className="px-2 py-4">
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === competition.id ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${typeBadgeColors[competition.type] || 'bg-gray-100 text-gray-500'}`}
                  >
                    {typeLabels[competition.type] || competition.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(competition.startDate)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDate(competition.endDate)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full ${statusColors[competition.status] || 'bg-gray-100 text-gray-500'}`}
                  >
                    {competition.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">{competition.entryCount}</td>
                <td className="px-4 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                  <Link
                    href={`/admin/competitions/${competition.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    Edit
                  </Link>
                  {deleteId === competition.id ? (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleDelete(competition.id)}
                        className="text-red-600 hover:text-red-900 text-xs font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteId(competition.id)}
                      className="text-red-600 hover:text-red-900 text-sm ml-2"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === competition.id && (
                <tr>
                  <td colSpan={8} className="bg-gray-50 border-b border-gray-200">
                    <ParticipantsPanel competition={competition} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
