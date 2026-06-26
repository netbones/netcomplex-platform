'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useWorkflow } from '@/shared/lib/workflow';
import { useAutoSave } from '@/shared/lib/useAutoSave';
import type { WorkflowConfig } from '@/shared/lib/workflow/types';
import type { DisputeCreateInput } from '@entities/dispute';
import type { IntakeScreenOutput } from '@entities/dispute/server';

// ============================================
// Types
// ============================================
export type IntakeStep = 'emotion' | 'checklist' | 'frivolity' | 'tips' | 'form' | 'review';

export type IntakeContext = Record<string, unknown> & {
  selectedEmotion: string | null;
  checklistItems: Record<string, boolean>;
  description: string;
  aiResult: IntakeScreenOutput | null;
  aiEnabled: boolean;
  formData: DisputeCreateInput | null;
};

// ============================================
// Hook
// ============================================

interface UseDisputeIntakeOptions {
  aiEnabled: boolean;
  onComplete: (disputeId: string) => void;
  onCancel: () => void;
}

export function useDisputeIntake({ aiEnabled, onComplete, onCancel }: UseDisputeIntakeOptions) {
  const hasRestored = useRef(false);
  const workflowConfig = useMemo<WorkflowConfig<IntakeStep, IntakeContext>>(
    () => ({
      initialStep: 'emotion',
      steps: [
        { id: 'emotion', component: (() => null) as never },
        { id: 'checklist', component: (() => null) as never },
        {
          id: 'frivolity',
          component: (() => null) as never,
          condition: ctx => ctx.aiEnabled,
        },
        { id: 'tips', component: (() => null) as never },
        {
          id: 'form',
          component: (() => null) as never,
          validate: ctx =>
            ctx.formData ? null : 'Please complete the dispute form before reviewing.',
        },
        { id: 'review', component: (() => null) as never },
      ],
      transitions: [
        { from: 'emotion', to: 'checklist' },
        {
          from: 'checklist',
          to: 'frivolity',
          guard: ctx => ctx.aiEnabled,
        },
        {
          from: 'checklist',
          to: 'tips',
          guard: ctx => !ctx.aiEnabled,
        },
        { from: 'frivolity', to: 'tips' },
        { from: 'tips', to: 'form' },
        { from: 'form', to: 'review' },
        {
          from: 'review',
          to: '__complete__' as never,
          effect: async ctx => {
            try {
              const response = await fetch('/api/disputes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ctx.formData),
              });
              if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
              }
              const data = await response.json();
              const disputeId = data?.id ?? data?.dispute?.id;
              if (disputeId) {
                onComplete(disputeId);
              }
            } catch {
              // Error handled by the wizard's form submission flow
            }
          },
        },
      ],
      onComplete: () => {
        // Handled in the review transition effect above
      },
    }),
    [aiEnabled, onComplete]
  );

  const workflow = useWorkflow<IntakeStep, IntakeContext>(workflowConfig);

  // Auto-save: persist workflow context to localStorage on debounce
  const autoSave = useAutoSave<IntakeContext>({
    key: 'dispute-intake-wizard',
    data: workflow.ctx,
    delay: 2000,
    enabled: !workflow.isComplete,
  });

  // Restore saved state on mount (if any)
  const savedCtx = autoSave.savedData;
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    if (savedCtx && savedCtx.selectedEmotion !== undefined) {
      const merged: Partial<IntakeContext> = { ...savedCtx, aiEnabled };
      workflow.updateCtx(merged as Partial<IntakeContext>);
    } else {
      workflow.updateCtx({ aiEnabled } as Partial<IntakeContext>);
    }
  }, [savedCtx, aiEnabled, workflow]);

  return {
    workflow,
    autoSave,
    savedCtx,
    onCancel,
  };
}
