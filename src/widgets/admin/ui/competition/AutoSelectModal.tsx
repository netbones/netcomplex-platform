'use client';

import { toast } from 'sonner';
import { trpc } from '@api/client';

export function AutoSelectModal({
  competitionId,
  winnersCount,
  onClose,
}: {
  competitionId: string;
  winnersCount: number;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();

  const markWinnerMutation = trpc.competitions.markWinner.useMutation({
    onSuccess: () => {
      utils.competitions.listParticipants.invalidate({ competitionId });
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const handleAutoSelect = async () => {
    const result = await utils.competitions.listParticipants.fetch({ competitionId });
    const { participants } = result.data;

    const joinEntries = participants
      .filter(p => p.status === 'JOINED' && p.score != null)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const top = joinEntries.slice(0, winnersCount);

    if (top.length === 0) {
      toast.error('No scored participants to select from');
      return;
    }

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
