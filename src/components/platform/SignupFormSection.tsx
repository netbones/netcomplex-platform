import { ReactNode } from 'react';
import { SectionLayout } from '@/components/layout/SectionLayout';

interface SignupFormSectionProps {
  children: ReactNode;
  title: string;
  description?: string;
}

/**
 * SignupFormSection provides consistent layout for signup form steps.
 * Includes title and optional description for each step.
 */
export function SignupFormSection({ children, title, description }: SignupFormSectionProps) {
  return (
    <SectionLayout size="lg" className="flex-1">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-bark mb-2">{title}</h2>
          {description && <p className="text-lg text-slate-600">{description}</p>}
        </div>
        {children}
      </div>
    </SectionLayout>
  );
}
