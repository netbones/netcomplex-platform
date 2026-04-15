'use client';

interface OnlineIndicatorProps {
  count: number;
  showLabel?: boolean;
}

export function OnlineIndicator({ count, showLabel = true }: OnlineIndicatorProps) {
  if (!showLabel) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>
      <span className="text-sm text-gray-600">{count} online</span>
    </div>
  );
}
