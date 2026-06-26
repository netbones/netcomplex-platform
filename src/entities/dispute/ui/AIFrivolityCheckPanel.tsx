'use client';

import { useState } from 'react';
import { LoadingSkeleton } from '@shared/ui';

interface AIFrivolityCheckPanelProps {
  disputeId: string;
  description: string;
}

interface IntakeResult {
  toneScore: number;
  likelyFrivolous: boolean;
  suggestedCategory: string;
  deEscalationTip: string | null;
}

type PanelState = 'idle' | 'loading' | 'result' | 'error' | 'quota';

export function AIFrivolityCheckPanel({ disputeId, description }: AIFrivolityCheckPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheck = async () => {
    setState('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/disputes/intake-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, disputeId }),
      });

      if (res.status === 429) {
        setState('quota');
        return;
      }

      if (res.status === 503) {
        setState('error');
        setErrorMessage('AI dispute screening is currently unavailable. You can still proceed.');
        return;
      }

      if (!res.ok) {
        setState('error');
        setErrorMessage('AI screening is currently unavailable. You can still proceed.');
        return;
      }

      const json = await res.json();
      const data = json.data ?? json;
      setResult({
        toneScore: data.toneScore ?? 0,
        likelyFrivolous: data.likelyFrivolous ?? false,
        suggestedCategory: data.suggestedCategory ?? 'OTHER',
        deEscalationTip: data.deEscalationTip ?? null,
      });
      setState('result');
    } catch {
      setState('error');
      setErrorMessage('AI screening is currently unavailable. You can still proceed.');
    }
  };

  const toneScoreColor = (score: number) => {
    if (score <= 3) return 'bg-emerald-500';
    if (score <= 7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const toneScoreBarWidth = (score: number) => `${Math.max((score / 10) * 100, 4)}%`;

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Dispute Check</h3>

      {/* Idle */}
      {state === 'idle' && (
        <button
          onClick={handleCheck}
          className="w-full px-4 py-2 bg-soralia-primary text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Check Dispute
        </button>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="space-y-2">
          <LoadingSkeleton lines={3} height="h-4" />
          <p className="text-xs text-gray-400 text-center">Analyzing dispute description...</p>
        </div>
      )}

      {/* Result */}
      {state === 'result' && result && (
        <div className="space-y-4">
          {/* Tone Score */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Tone Score</span>
              <span className="text-xs font-semibold text-gray-700">{result.toneScore}/10</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${toneScoreColor(result.toneScore)}`}
                style={{ width: toneScoreBarWidth(result.toneScore) }}
              />
            </div>
          </div>

          {/* Likely Frivolous */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Likely Frivolous:</span>
            {result.likelyFrivolous ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Potentially Frivolous
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Not Frivolous
              </span>
            )}
          </div>

          {/* De-escalation Tip */}
          {result.deEscalationTip && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <span className="text-xs font-medium text-gray-500 block mb-1">
                De-escalation Tip:
              </span>
              <p className="text-sm text-gray-600 italic">{result.deEscalationTip}</p>
            </div>
          )}

          {/* Re-trigger */}
          <button
            onClick={handleCheck}
            className="text-xs text-soralia-primary hover:text-indigo-700 underline"
          >
            Check again
          </button>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          {errorMessage}
          <button
            onClick={handleCheck}
            className="block mt-2 text-xs text-amber-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quota */}
      {state === 'quota' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          AI screening quota has been reached for this period. You can still proceed with your
          dispute filing.
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3">
        AI analysis is advisory only. Results are not stored.
      </p>
    </div>
  );
}
