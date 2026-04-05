import { NextResponse } from 'next/server';
import { db, settings } from '@/lib/db';
import { eq, like } from 'drizzle-orm';
import { withTenant, withTenantOptional } from '@/lib/tenant/with-tenant';

export async function GET() {
  // Allow reading settings without tenant (for public access)
  const { tenantId } = await withTenantOptional();

  if (!tenantId) {
    return NextResponse.json({});
  }

  const contactSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

  const settingsMap = contactSettings.reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>
  );

  return NextResponse.json(settingsMap);
}

export async function POST(request: Request) {
  const { tenantId } = await withTenant();
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing[0]) {
      await db
        .update(settings)
        .set({ value: String(value) })
        .where(eq(settings.key, key));
    } else {
      // Generate ID for new setting
      const newId = key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      await db.insert(settings).values({ id: newId, tenantId, key, value: String(value) });
    }
  }

  return NextResponse.json({ success: true });
}
