'use client';

import { CATEGORY_LABELS, SEVERITY_LABELS, RESPONDENT_LABELS } from '@entities/dispute';
import type { DisputeCreateInput } from '@entities/dispute';
import type { IntakeScreenOutput } from '@entities/dispute/server';
import { AlertTriangle, Clock } from 'lucide-react';
import { LoadingSpinner } from '@shared/ui';

interface ReviewScreenProps {
  formData: DisputeCreateInput;
  aiResult: IntakeScreenOutput | null;
  aiEnabled: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function ReviewScreen({
  formData,
  aiResult,
  aiEnabled,
  onSubmit,
  isSubmitting,
}: ReviewScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Review Your Dispute</h3>
        <p className="text-sm text-gray-500 mt-1">
          Please review all details before submitting. Once submitted, your dispute will be reviewed
          by a moderator.
        </p>
      </div>

      {/* AI Warning Banner */}
      {aiEnabled && aiResult && aiResult.likelyFrivolous && (
        <div className="rounded-lg border-l-4 border-l-amber-400 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                AI noted: tone appears emotional. Consider focusing on facts.
              </p>
              <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 mt-2">
                Tone: {aiResult.toneScore}/10
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Form Data Summary */}
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">Category</span>
          <span className="text-sm font-medium text-gray-900">
            {CATEGORY_LABELS[formData.category]}
          </span>
        </div>
        <div className="px-4 py-3">
          <span className="text-xs text-gray-500 block">Title</span>
          <span className="text-sm font-medium text-gray-900 mt-0.5 block">{formData.title}</span>
        </div>
        <div className="px-4 py-3">
          <span className="text-xs text-gray-500 block">Description</span>
          <span className="text-sm text-gray-900 mt-0.5 block">
            {truncate(formData.description, 150)}
          </span>
        </div>
        {formData.desiredOutcome && (
          <div className="px-4 py-3">
            <span className="text-xs text-gray-500 block">Desired Outcome</span>
            <span className="text-sm text-gray-900 mt-0.5 block">
              {truncate(formData.desiredOutcome, 100)}
            </span>
          </div>
        )}
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">Respondent</span>
          <span className="text-sm font-medium text-gray-900">
            {RESPONDENT_LABELS[formData.respondentType]}
          </span>
        </div>
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">Severity</span>
          <span className="text-sm font-medium text-gray-900">
            {SEVERITY_LABELS[formData.severity]}
          </span>
        </div>
      </div>

      {/* Estimated Process Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          Estimated Process
        </h4>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Average timeline: 7–14 days from submission to resolution.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {['Submit', 'Moderator Review', 'Mediation', 'Resolution'].map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-soralia-primary text-white text-xs font-semibold">
                {idx + 1}
              </span>
              <span className="text-xs font-medium text-gray-700">{step}</span>
              {idx < 3 && <span className="text-gray-300 mx-1">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Attachments placeholder */}
      <p className="text-xs text-gray-400">0 attachments included</p>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-soralia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              Submitting...
            </>
          ) : (
            'Submit Dispute'
          )}
        </button>

        <button
          type="button"
          className="rounded-md px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back to list
        </button>
      </div>
    </div>
  );
}
