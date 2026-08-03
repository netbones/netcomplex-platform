'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { disputeCreateSchema, type DisputeCreateInput } from '@entities/dispute';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  RESPONDENT_LABELS,
  ALL_DISPUTE_CATEGORIES,
} from '@entities/dispute';
import { toast } from 'sonner';
import { useState } from 'react';
import { LoadingSpinner } from '@shared/ui';
import { apiPost } from '@/shared/api/http-client';

// Severity options from the schema
const SEVERITY_OPTIONS = ['MINOR', 'MODERATE', 'SERIOUS', 'URGENT'] as const;

// Respondent type options from the schema
const RESPONDENT_OPTIONS = ['RESIDENT', 'HOA', 'BOARD_MEMBER', 'TENANT_PROVIDER'] as const;

interface DisputeFormProps {
  onComplete: (disputeId: string) => void;
  onCancel: () => void;
}

export function DisputeForm({ onComplete, onCancel }: DisputeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DisputeCreateInput>({
    // zodResolver infers input type (optional defaults) vs useForm infers output type (required defaults)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(disputeCreateSchema) as any,
    defaultValues: {
      category: undefined as unknown as DisputeCreateInput['category'],
      title: '',
      description: '',
      severity: 'MODERATE',
      respondentType: 'RESIDENT',
    } as DisputeCreateInput,
  });

  const onSubmit = async (data: DisputeCreateInput) => {
    setIsSubmitting(true);
    try {
      // Transform empty respondentId to undefined (Zod .uuid().optional() rejects "")
      const payload: DisputeCreateInput = {
        ...data,
        respondentId:
          data.respondentId && (data.respondentId as string).trim() !== ''
            ? data.respondentId
            : undefined,
      };

      const { data: result } = await apiPost<{ id?: string; dispute?: { id?: string } }>(
        '/api/disputes',
        payload
      );

      const disputeId = result?.id ?? result?.dispute?.id;

      if (!disputeId) {
        throw new Error('No dispute ID returned from server');
      }

      onComplete(disputeId);
    } catch {
      toast.error('Submission failed', {
        description:
          "We couldn't file your dispute. Please check your entries and try again. If the problem persists, contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Dispute Details</h3>
        <p className="text-sm text-gray-500 mt-1">
          Provide the details of your dispute. All fields marked with a red asterisk are required.
        </p>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            {...register('category')}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a category</option>
            {ALL_DISPUTE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            placeholder="Brief title describing the issue"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={5}
            placeholder="Describe what happened, when, and who was involved"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Desired Outcome */}
        <div>
          <label htmlFor="desiredOutcome" className="block text-sm font-medium text-gray-700">
            Desired Outcome
          </label>
          <textarea
            id="desiredOutcome"
            {...register('desiredOutcome')}
            rows={3}
            placeholder="What resolution would you like to see?"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.desiredOutcome && (
            <p className="mt-1 text-xs text-red-600">{errors.desiredOutcome.message}</p>
          )}
        </div>

        {/* Respondent Type */}
        <div>
          <label htmlFor="respondentType" className="block text-sm font-medium text-gray-700">
            Respondent
          </label>
          <select
            id="respondentType"
            {...register('respondentType')}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {RESPONDENT_OPTIONS.map(resp => (
              <option key={resp} value={resp}>
                {RESPONDENT_LABELS[resp]}
              </option>
            ))}
          </select>
          {errors.respondentType && (
            <p className="mt-1 text-xs text-red-600">{errors.respondentType.message}</p>
          )}
        </div>

        {/* Respondent ID */}
        <div>
          <label htmlFor="respondentId" className="block text-sm font-medium text-gray-700">
            Respondent ID <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="respondentId"
            type="text"
            {...register('respondentId', {
              setValueAs: (v: string) => (v === '' ? undefined : v),
            })}
            placeholder="UUID of the respondent"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.respondentId && (
            <p className="mt-1 text-xs text-red-600">{errors.respondentId.message}</p>
          )}
        </div>

        {/* Severity */}
        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
            Severity
          </label>
          <select
            id="severity"
            {...register('severity')}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-soralia-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SEVERITY_OPTIONS.map(sev => (
              <option key={sev} value={sev}>
                {SEVERITY_LABELS[sev]}
              </option>
            ))}
          </select>
          {errors.severity && (
            <p className="mt-1 text-xs text-red-600">{errors.severity.message}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
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
          onClick={onCancel}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back to list
        </button>
      </div>
    </form>
  );
}
