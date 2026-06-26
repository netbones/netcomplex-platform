'use client';

import { CheckCircle } from 'lucide-react';

interface EmotionCheckInProps {
  selected: string | null;
  onSelect: (emotion: string) => void;
}

const EMOTIONS = [
  { emoji: '😤', label: 'Very angry', value: 'very_angry' },
  { emoji: '😟', label: 'Upset', value: 'upset' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '🙂', label: 'Calm', value: 'calm' },
  { emoji: '😌', label: 'Resolved', value: 'resolved' },
] as const;

export function EmotionCheckIn({ selected, onSelect }: EmotionCheckInProps) {
  const showSoftGate = selected === 'very_angry' || selected === 'upset';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          How are you feeling about this situation?
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          This helps us understand your perspective. Your emotional state is not stored — only that
          you completed this check-in.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {EMOTIONS.map(({ emoji, label, value }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-pressed={isSelected}
              aria-label={label}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all min-w-[80px]
                ${
                  isSelected
                    ? 'border-soralia-primary bg-indigo-50 scale-110 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <span className="text-3xl leading-none" role="img" aria-hidden="true">
                {emoji}
              </span>
              <span className="text-xs text-gray-700 mt-2 font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="flex items-center justify-center gap-2 text-sm text-soralia-primary">
          <CheckCircle className="w-4 h-4" />
          <span>Response recorded — thank you for sharing.</span>
        </div>
      )}

      {showSoftGate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">We understand this is difficult.</p>
          <p className="text-sm text-amber-700 mt-1">
            We understand this is frustrating. Would you like to save a draft and come back later,
            or continue filing?
          </p>
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              Save Draft &amp; Return Later
            </button>
            <button
              type="button"
              className="rounded-md bg-soralia-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Continue Filing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
