interface OnboardingStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function OnboardingStep({ title, description, children }: OnboardingStepProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">{children}</div>
    </div>
  );
}
