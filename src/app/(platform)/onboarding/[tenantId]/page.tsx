'use client';

import React, { use } from 'react';
import { OnboardingWizard } from '@features/onboarding/ui/OnboardingWizard';

interface Props {
  params: Promise<{ tenantId: string }>;
}

export default function OnboardingPage({ params }: Props) {
  const { tenantId } = use(params);

  return <OnboardingWizard tenantId={tenantId} />;
}
