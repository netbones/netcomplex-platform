import { NextRequest, NextResponse } from 'next/server';
import { db, settings } from '@api/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logError } from '@shared/lib';

interface OnboardingRequest {
  tenantId: string;
  step: number;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingRequest = await request.json();
    const { tenantId, step, data } = body;

    if (!tenantId || step === undefined || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, step, data' },
        { status: 400 }
      );
    }

    // Save step data as tenant settings
    const settingKey = `onboarding_step_${step}`;

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(rows => rows.find(s => s.key === settingKey));

    if (existing) {
      await db
        .update(settings)
        .set({ value: JSON.stringify(data) })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: settingKey,
        value: JSON.stringify(data),
      });
    }

    // Mark onboarding as complete when step 5 is saved
    if (step === 5) {
      const completedKey = 'onboarding_completed';
      const completedExisting = await db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tenantId))
        .then(rows => rows.find(s => s.key === completedKey));

      if (completedExisting) {
        await db
          .update(settings)
          .set({ value: 'true' })
          .where(eq(settings.id, completedExisting.id));
      } else {
        await db.insert(settings).values({
          id: uuidv4(),
          tenantId,
          key: completedKey,
          value: 'true',
        });
      }
    }

    return NextResponse.json({ success: true, step });
  } catch (error) {
    logError(
      { component: 'platform-onboarding-api', operation: 'SAVE' },
      'Failed to save onboarding progress',
      error
    );
    return NextResponse.json({ error: 'Failed to save onboarding progress' }, { status: 500 });
  }
}
