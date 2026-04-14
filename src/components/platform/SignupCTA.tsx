import { PrimaryCTA } from '@shared/ui/PrimaryCTA';

interface SignupCTAProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
  canProceed: boolean;
}

/**
 * SignupCTA provides navigation and action buttons for the signup wizard.
 * Handles step navigation and final submission.
 */
export function SignupCTA({
  step,
  totalSteps,
  onNext,
  onBack,
  loading,
  canProceed,
}: SignupCTAProps) {
  const isLastStep = step === totalSteps;
  const isFirstStep = step === 1;

  return (
    <div className="mt-8 flex justify-between items-center">
      {!isFirstStep && (
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
      )}

      <div className="ml-auto">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || loading}
          className="px-8 py-3 bg-canopy text-white font-semibold rounded-lg hover:bg-canopy-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Community...
            </span>
          ) : isLastStep ? (
            'Create Community'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
