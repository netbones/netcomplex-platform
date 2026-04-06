interface SignupHeaderProps {
  steps: { num: number; label: string }[];
  currentStep: number;
}

/**
 * SignupHeader displays the progress indicator for the signup wizard.
 * Shows current step and allows navigation between steps.
 */
export function SignupHeader({ steps, currentStep }: SignupHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.num < currentStep
                      ? 'bg-green-500 text-white'
                      : step.num === currentStep
                        ? 'bg-canopy text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step.num < currentStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    step.num <= currentStep ? 'text-bark' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 ${
                    step.num < currentStep ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
