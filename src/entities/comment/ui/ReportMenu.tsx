'use client';

import { useCallback, useState } from 'react';
import { Flag, MoreHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc, authClient } from '@api/client';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui';
import { Button } from '@shared/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ReportReason } from '@entities/comment';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'HATE_SPEECH', label: 'Hate speech' },
  { value: 'VIOLENCE', label: 'Violence' },
  { value: 'NSFW', label: 'NSFW content' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
];

export interface ReportMenuProps {
  commentId: string;
}

export function ReportMenu({ commentId }: ReportMenuProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const reportMutation = trpc.comments.report.useMutation({
    onSuccess: () => {
      toast.success('Reported — moderators will review.');
      setOpen(false);
      setReason(null);
      setNote('');
    },
    onError: error => {
      if (error.message.toLowerCase().includes('already')) {
        toast.warning('You already reported this comment.');
      } else {
        toast.error(error.message || 'Failed to report comment');
      }
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!session?.user) {
      toast.error('Sign in to report a comment.');
      return;
    }
    if (!reason) return;
    await reportMutation.mutateAsync({ commentId, reason, note: note.trim() || undefined });
    utils.comments.list.invalidate();
  }, [session, reason, note, reportMutation, commentId, utils]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Report comment"
          className={cn(
            'rounded p-1 text-xs text-gray-400 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700'
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-red-500" />
            <span className="text-sm font-medium">Report comment</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1 mb-2">
          {REASONS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn(
                'w-full rounded px-2 py-1.5 text-left text-sm transition-colors',
                reason === r.value
                  ? 'bg-red-50 font-medium text-red-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional context for moderators…"
          rows={2}
          maxLength={1000}
          className={cn(
            'w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-xs',
            'focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300'
          )}
        />

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {reason ? `Selected: ${REASONS.find(r => r.value === reason)?.label}` : 'Pick a reason'}
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason || reportMutation.isPending}
            onClick={() => void handleSubmit()}
          >
            Report
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
