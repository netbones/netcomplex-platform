'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { LoadingSkeleton } from '@shared/ui';
import type { IntakeScreenOutput } from '@entities/dispute/server';
import { parseIntakeScreenOutput } from '@shared/lib/dispute/intake-screen-output';
import { cn } from '@shared/lib';

interface FrivolityScreenProps {
  description: string;
  onResult: (result: IntakeScreenOutput) => void;
  onProceed: () => void;
}

export function FrivolityScreen({ description, onResult, onProceed }: FrivolityScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeScreenOutput | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchIntakeScreen() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/disputes/intake-screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const parsed = parseIntakeScreenOutput(
          typeof data === 'string' ? data : JSON.stringify(data)
        );

        if (cancelled) return;
        setResult(parsed);
        onResult(parsed);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchIntakeScreen();

    return () => {
      cancelled = true;
    };
  }, [description, onResult]);

  const handleProceedSubmit = (e: FormEvent) => {
    e.preventDefault();
    onProceed();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Analyzing your dispute...</h3>
        <LoadingSkeleton height="h-4" className="w-full" />
        <LoadingSkeleton height="h-4" className="w-3/4" />
        <LoadingSkeleton height="h-10" className="w-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Assessment unavailable</h3>
            <p className="text-sm text-amber-700 mt-1">
              The automated assessment is currently unavailable. You can still proceed to file your
              dispute.
            </p>
          </div>
        </div>
        <form onSubmit={handleProceedSubmit}>
          <button
            type="submit"
            className="rounded-md bg-soralia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Proceed
          </button>
        </form>
      </div>
    );
  }

  if (!result) return null;

  const isFlagged = result.likelyFrivolous;
  const tipText = result.deEscalationTip;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Dispute Assessment</h3>
        <p className="text-sm text-gray-500 mt-1">
          Our system has analyzed your dispute description. Here&apos;s what it found.
        </p>
      </div>

      {/* AI Result Banner */}
      <div
        className={cn(
          'rounded-lg border p-4 flex items-start gap-3',
          isFlagged ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
        )}
      >
        {isFlagged ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        )}
        <div>
          {isFlagged ? (
            <>
              <h4 className="text-sm font-medium text-amber-800">
                Our system flagged some concerns
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                Please review the following before proceeding.
              </p>
            </>
          ) : (
            <h4 className="text-sm font-medium text-emerald-800">
              Your dispute does not appear frivolous.
            </h4>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tone Score</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{result.toneScore}/10</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                result.toneScore >= 7
                  ? 'bg-amber-500'
                  : result.toneScore >= 4
                    ? 'bg-indigo-400'
                    : 'bg-emerald-500'
              )}
              style={{ width: `${(result.toneScore / 10) * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Issue Clarity</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{result.issueClarity}/10</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${(result.issueClarity / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* De-escalation Tip */}
      {tipText && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Suggestion</p>
          <p className="text-sm text-blue-700 mt-1">{tipText}</p>
        </div>
      )}

      {/* Advisory Note */}
      <p className="text-xs text-gray-500">
        This is an automated assessment. You may still file your dispute regardless of this result.
      </p>

      {/* Proceed Button */}
      <form onSubmit={handleProceedSubmit}>
        <button
          type="submit"
          className="rounded-md bg-soralia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Proceed
        </button>
      </form>
    </div>
  );
}
