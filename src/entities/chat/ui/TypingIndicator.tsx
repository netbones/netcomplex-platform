'use client';

interface TypingIndicatorProps {
  message: string | null;
}

export function TypingIndicator({ message }: TypingIndicatorProps) {
  if (!message) return null;

  return <div className="px-4 py-1 text-xs text-gray-500 italic">{message}</div>;
}
