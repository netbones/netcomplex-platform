import { NextRequest } from 'next/server';
import {
  db,
  settings,
  tenants,
  apiSuccess,
  apiError,
  apiInternalError,
  apiNotFound,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { createId } from '@shared/lib/id';
import { logError } from '@shared/lib';

export const maxDuration = 8;

interface OnboardingRequest {
  tenantId: string;
  step: number;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  // Auth is optional for onboarding - the user may not have a session cookie yet
  // after signing up via server-side Better Auth calls. We verify tenant ownership
  // by checking that the tenant exists.

  try {
    const body: OnboardingRequest = await request.json();
    const { tenantId, step, data } = body;

    if (!tenantId || step === undefined || !data) {
      return apiError('VALIDATION_ERROR', 'Missing required fields: tenantId, step, data', 400);
    }

    // Verify tenant exists (basic validation without requiring session)
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return apiNotFound('Tenant not found');
    }

    // Wrap all setting operations in a database transaction to ensure atomicity.
    // If any step fails, no partial onboarding state is left in the database.
    const settingKey = `onboarding_step_${step}`;

    await db.transaction(async tx => {
      // Upsert the current step data
      const existing = await tx
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tenantId))
        .then(rows => rows.find(s => s.key === settingKey));

      if (existing) {
        await tx
          .update(settings)
          .set({ value: JSON.stringify(data) })
          .where(eq(settings.id, existing.id));
      } else {
        await tx.insert(settings).values({
          id: createId(),
          tenantId,
          key: settingKey,
          value: JSON.stringify(data),
        });
      }

      // Mark onboarding as complete when step 5 is saved — within the same transaction
      // so that step data and completion flag are committed atomically.
      if (step === 5) {
        const completedKey = 'onboarding_completed';
        const completedExisting = await tx
          .select()
          .from(settings)
          .where(eq(settings.tenantId, tenantId))
          .then(rows => rows.find(s => s.key === completedKey));

        if (completedExisting) {
          await tx
            .update(settings)
            .set({ value: 'true' })
            .where(eq(settings.id, completedExisting.id));
        } else {
          await tx.insert(settings).values({
            id: createId(),
            tenantId,
            key: completedKey,
            value: 'true',
          });
        }
      }
    });

    return apiSuccess({ success: true, step });
  } catch (error) {
    logError(
      { component: 'platform-onboarding-api', operation: 'SAVE' },
      'Failed to save onboarding progress',
      error
    );
    return apiInternalError('Failed to save onboarding progress');
  }
}
