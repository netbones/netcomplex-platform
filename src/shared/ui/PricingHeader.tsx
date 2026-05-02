import { SectionLayout } from '@shared/ui/SectionLayout';

export function PricingHeader() {
  return (
    <SectionLayout size="lg" background="transparent" className="bg-lapis-deep text-white">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Plans That Fit Your Community
        </h1>
        <p className="text-xl text-lapis-azure/80 max-w-2xl mx-auto">
          Three tiers designed to meet your community where it is — and grow with you. All plans
          include a 14-day free trial.
        </p>
      </div>
    </SectionLayout>
  );
}
