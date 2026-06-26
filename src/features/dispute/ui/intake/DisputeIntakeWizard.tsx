'use client';

import { CheckCircle } from 'lucide-react';
import { cn } from '@shared/lib';
import { useDisputeIntake } from '../../model/useDisputeIntake';
import type { IntakeStep, IntakeContext } from '../../model/useDisputeIntake';
import { EmotionCheckIn } from './EmotionCheckIn';
import { SelfResolutionChecklist } from './SelfResolutionChecklist';
import { FrivolityScreen } from './FrivolityScreen';
import { ConflictTipsPanel } from './ConflictTipsPanel';
import { ReviewScreen } from './ReviewScreen';
import { DisputeForm } from '../DisputeForm';
import type { DisputeCreateInput } from '@entities/dispute';

interface DisputeIntakeWizardProps {
  aiEnabled: boolean;
  onComplete: (disputeId: string) => void;
  onCancel: () => void;
}

const STEP_LABELS: Record<IntakeStep, string> = {
  emotion: 'How are you feeling?',
  checklist: 'Self-resolution checklist',
  frivolity: 'Dispute assessment',
  tips: 'Conflict resolution tips',
  form: 'Dispute Details',
  review: 'Review & Submit',
};

const STEP_NUMBERS: Record<IntakeStep, number> = {
  emotion: 1,
  checklist: 2,
  frivolity: 3,
  tips: 4,
  form: 5,
  review: 6,
};

export function DisputeIntakeWizard({ aiEnabled, onComplete, onCancel }: DisputeIntakeWizardProps) {
  const {
    workflow,
    autoSave,
    onCancel: hookCancel,
  } = useDisputeIntake({
    aiEnabled,
    onComplete,
    onCancel,
  });

  const { currentStep, ctx, updateCtx, next, completedSteps, validationError } = workflow;

  // Handlers for each stage
  const handleEmotionSelect = (emotion: string) => {
    updateCtx({ selectedEmotion: emotion });
  };

  const handleChecklistToggle = (id: string) => {
    const prev = (ctx.checklistItems as Record<string, boolean>) ?? {};
    updateCtx({
      checklistItems: { ...prev, [id]: !prev[id] },
    });
  };

  const handleFormComplete = (disputeId: string) => {
    // Form handles its own submission; wizard delegates
    onComplete(disputeId);
  };

  const handleFormCancel = () => {
    hookCancel();
  };

  const handleReviewSubmit = () => {
    // Submit via the workflow transition effect
    next();
  };

  // Determine if the next button should be shown (for stages that don't have their own CTA)
  const showNextButton =
    currentStep === 'emotion' || currentStep === 'checklist' || currentStep === 'tips';

  const isStepComplete = (step: IntakeStep): boolean => {
    return completedSteps.includes(step);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'emotion':
        return (
          <EmotionCheckIn
            selected={(ctx.selectedEmotion as string) ?? null}
            onSelect={handleEmotionSelect}
          />
        );

      case 'checklist':
        return (
          <SelfResolutionChecklist
            checked={(ctx.checklistItems as Record<string, boolean>) ?? {}}
            onToggle={handleChecklistToggle}
          />
        );

      case 'frivolity':
        return (
          <FrivolityScreen
            description={(ctx.description as string) ?? ''}
            onResult={result => {
              updateCtx({ aiResult: result as IntakeContext['aiResult'] });
            }}
            onProceed={next}
          />
        );

      case 'tips':
        return <ConflictTipsPanel emotionScore={(ctx.selectedEmotion as string) ?? 'neutral'} />;

      case 'form':
        return (
          <DisputeForm
            onComplete={disputeId => {
              // Store form data in context then proceed to review
              // The form already POSTs to /api/disputes, but the wizard
              // needs to capture the data for the review step.
              // For now, advance to review — the form's onComplete navigates away.
              handleFormComplete(disputeId);
            }}
            onCancel={handleFormCancel}
          />
        );

      case 'review': {
        const formData = (ctx.formData as DisputeCreateInput) ?? ({} as DisputeCreateInput);
        const aiResult = (ctx.aiResult ?? null) as IntakeContext['aiResult'];

        return (
          <ReviewScreen
            formData={formData}
            aiResult={aiResult}
            aiEnabled={aiEnabled}
            onSubmit={handleReviewSubmit}
            isSubmitting={false}
          />
        );
      }

      default:
        return null;
    }
  };

  // Show saved indicator
  const savedIndicator =
    autoSave.secondsSinceSave !== null ? (
      <p className="text-xs text-gray-400">
        Saved {autoSave.secondsSinceSave} second{autoSave.secondsSinceSave !== 1 ? 's' : ''} ago
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={hookCancel}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          &larr; Back to My Disputes (0 active)
        </button>

        {savedIndicator}
      </div>

      {/* Wizard Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">File a Dispute</h2>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-1 flex-wrap" aria-label="Wizard steps">
        {(['emotion', 'checklist', 'frivolity', 'tips', 'form', 'review'] as IntakeStep[]).map(
          (step, idx) => {
            // Skip frivolity step in the indicator when AI is disabled
            if (step === 'frivolity' && !aiEnabled) return null;

            const stepNum = STEP_NUMBERS[step];
            const completed = isStepComplete(step);
            const isCurrent = step === currentStep;

            return (
              <div key={step} className="flex items-center gap-1">
                {idx > 0 && <span className="text-gray-300 mx-1">&rarr;</span>}

                {completed ? (
                  <span
                    className={cn('inline-flex items-center gap-1 text-sm', 'text-soralia-primary')}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="sr-only">{stepNum}. </span>
                    {STEP_LABELS[step]}
                  </span>
                ) : isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-soralia-primary">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-soralia-primary text-white text-xs">
                      {stepNum}
                    </span>
                    {STEP_LABELS[step]}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs">
                      {stepNum}
                    </span>
                    {STEP_LABELS[step]}
                  </span>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {/* Current Step Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">{renderStep()}</div>

      {/* Next Button for applicable steps */}
      {showNextButton && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-soralia-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={hookCancel}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to list
          </button>
        </div>
      )}
    </div>
  );
}
