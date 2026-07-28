'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@api/client';

export function DrawWinnersModal({
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
    onSuccess: envelope => {
      toast.success(`${envelope.data.length} winner(s) drawn!`);
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
