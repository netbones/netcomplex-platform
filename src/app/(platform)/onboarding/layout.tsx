import { PageLayout } from '@shared/ui';
import { PlatformFooter } from '@features/platform/ui';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout background="fieldstone">
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center py-12">{children}</main>
        <PlatformFooter />
      </div>
    </PageLayout>
  );
}
