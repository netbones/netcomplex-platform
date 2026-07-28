'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { trpc } from '@api/client';

import type { Competition } from './types';
import { formatDate } from './types';
import { StatusBadge } from './StatusBadge';
import { DrawWinnersModal } from './DrawWinnersModal';
import { AutoSelectModal } from './AutoSelectModal';

export function ParticipantsPanel({ competition }: { competition: Competition }) {
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

  const participants = data?.data?.participants ?? [];

  if (participants.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500">No participants yet</div>;
  }

  if (competition.type === 'RAFFLE') {
    return (
      <RafflePanel
        competitionId={competition.id}
        winnersCount={competition.winnersCount}
        competitionStatus={competition.status}
        participants={participants}
        drawModalOpen={drawModalOpen}
        onDrawToggle={() => setDrawModalOpen(!drawModalOpen)}
      />
    );
  }

  if (competition.type === 'PHOTO') {
    return (
      <PhotoPanel
        participants={participants}
        onMarkWinner={entryId => markWinnerMutation.mutate({ entryId })}
        onRemoveWinner={entryId => updateEntryMutation.mutate({ entryId, status: 'JOINED' })}
        isPending={markWinnerMutation.isPending}
      />
    );
  }

  if (competition.type === 'SCORE') {
    return (
      <ScorePanel
        competitionId={competition.id}
        winnersCount={competition.winnersCount}
        competitionStatus={competition.status}
        participants={participants}
        editingScore={editingScore}
        scoreValue={scoreValue}
        autoSelectModalOpen={autoSelectModalOpen}
        onToggleAutoSelect={() => setAutoSelectModalOpen(!autoSelectModalOpen)}
        onEditScore={(id, score) => {
          setEditingScore(id);
          setScoreValue(score ?? 0);
        }}
        onScoreChange={setScoreValue}
        onScoreSave={handleScoreSave}
        onCancelEdit={() => setEditingScore(null)}
      />
    );
  }

  return null;
}

function RafflePanel({
  competitionId,
  winnersCount,
  competitionStatus,
  participants,
  drawModalOpen,
  onDrawToggle,
}: {
  competitionId: string;
  winnersCount: number;
  competitionStatus: string;
  participants: {
    id: string;
    name: string;
    avatar?: string | null;
    joinedAt: string;
    status: string;
  }[];
  drawModalOpen: boolean;
  onDrawToggle: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {drawModalOpen && (
        <DrawWinnersModal
          competitionId={competitionId}
          winnersCount={winnersCount}
          onClose={onDrawToggle}
        />
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
        {competitionStatus === 'ENDED' ? (
          <button
            onClick={onDrawToggle}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Draw Winners
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">End competition to draw winners</span>
        )}
      </div>

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
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 relative">
                      {p.avatar ? (
                        <Image
                          src={p.avatar}
                          alt=""
                          fill
                          className="w-full h-full object-cover"
                          unoptimized
                        />
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

function PhotoPanel({
  participants,
  onMarkWinner,
  onRemoveWinner,
  isPending,
}: {
  participants: {
    id: string;
    name: string;
    avatar?: string | null;
    submissionUrl?: string | null;
    status: string;
    prize?: string | null;
  }[];
  onMarkWinner: (entryId: string) => void;
  onRemoveWinner: (entryId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {participants.map(p => (
          <div
            key={p.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden relative min-h-[160px]"
          >
            {p.submissionUrl ? (
              <Image
                src={p.submissionUrl}
                alt={`${p.name}'s submission`}
                fill
                className="w-full h-40 object-cover"
                unoptimized
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
                    onClick={() => onRemoveWinner(p.id)}
                    className="mt-1 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove Winner
                  </button>
                </div>
              )}
              {p.status === 'JOINED' && (
                <button
                  onClick={() => onMarkWinner(p.id)}
                  disabled={isPending}
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

function ScorePanel({
  competitionId,
  winnersCount,
  competitionStatus,
  participants,
  editingScore,
  scoreValue,
  autoSelectModalOpen,
  onToggleAutoSelect,
  onEditScore,
  onScoreChange,
  onScoreSave,
  onCancelEdit,
}: {
  competitionId: string;
  winnersCount: number;
  competitionStatus: string;
  participants: {
    id: string;
    name: string;
    avatar?: string | null;
    status: string;
    score?: number | null;
    joinedAt: string;
  }[];
  editingScore: string | null;
  scoreValue: number;
  autoSelectModalOpen: boolean;
  onToggleAutoSelect: () => void;
  onEditScore: (id: string, score: number | null) => void;
  onScoreChange: (value: number) => void;
  onScoreSave: (entryId: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {autoSelectModalOpen && (
        <AutoSelectModal
          competitionId={competitionId}
          winnersCount={winnersCount}
          onClose={onToggleAutoSelect}
        />
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </span>
        {competitionStatus === 'ENDED' && (
          <button
            onClick={onToggleAutoSelect}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Auto-select Winners
          </button>
        )}
      </div>

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
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 relative">
                      {p.avatar ? (
                        <Image
                          src={p.avatar}
                          alt=""
                          fill
                          className="w-full h-full object-cover"
                          unoptimized
                        />
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
                        onChange={e => onScoreChange(parseFloat(e.target.value) || 0)}
                        onBlur={() => onScoreSave(p.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') onScoreSave(p.id);
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => onEditScore(p.id, p.score)}
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
