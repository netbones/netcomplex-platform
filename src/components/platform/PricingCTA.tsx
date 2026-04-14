import { PageCTA } from '@shared/ui/PageCTA';

export function PricingCTA() {
  return (
    <PageCTA
      title="Still have questions?"
      description="Our team is here to help you find the right plan for your community."
      primaryAction={{
        href: '/contact',
        text: 'Contact Sales',
      }}
      secondaryAction={{
        href: '/signup',
        text: 'Start Free Trial',
      }}
      background="canopy"
    />
  );
}
