import { NextResponse } from 'next/server';
import { db, settings } from '@/lib/db';
import { eq, like } from 'drizzle-orm';

export async function GET() {
  const contactSettings = await db.select().from(settings).where(like(settings.key, 'contact.%'));

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
      await db.insert(settings).values({ id: newId, key, value: String(value) });
    }
  }

  return NextResponse.json({ success: true });
}
