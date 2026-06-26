'use client';

import type { DisputeMessageDTO } from '../model/types';

interface MediationMessageBubbleProps {
  message: DisputeMessageDTO;
  isOwn: boolean;
  showInternal: boolean;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MediationMessageBubble({
  message,
  isOwn,
  showInternal,
}: MediationMessageBubbleProps) {
  const isInternal = message.isInternal;

  if (isInternal && !showInternal) return null;

  const alignment = isInternal ? 'ml-auto' : isOwn ? 'ml-auto' : 'mr-auto';
  const bgColor = isInternal
    ? 'bg-amber-50 border border-amber-200'
    : isOwn
      ? 'bg-indigo-50 border border-indigo-100'
      : 'bg-white border border-gray-200';

  return (
    <div className={`flex flex-col max-w-[80%] ${alignment} mb-3`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 px-1">
        {isInternal && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Internal Note
          </span>
        )}
        <span className="text-[11px] text-gray-400">{relativeTime(message.createdAt)}</span>
      </div>

      {/* Bubble */}
      <div className={`rounded-lg px-3 py-2 text-sm ${bgColor}`}>
        <p className="text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}
