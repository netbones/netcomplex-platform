import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { getPoolProviderConfig } from '@api/server';
import { apiSuccess } from '@api/server';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  const config = getPoolProviderConfig();

  return apiSuccess({
    anthropicConfigured: !!config?.anthropicKey,
    openaiConfigured: !!config?.openaiKey,
    defaultProvider: config?.defaultProvider ?? null,
  });
}
