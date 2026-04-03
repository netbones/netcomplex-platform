import { db, users, groups, contents } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Fast stats endpoint - limit to 3 seconds
export const maxDuration = 3;

export async function GET() {
  // Count active users
  const activeUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
  const userCount = activeUsers.length;

  // Count active groups
  const activeGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.isActive, true));
  const groupCount = activeGroups.length;

  // Count conservation content (using raw category value)
  const conservationContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(eq(contents.category, 'CONSERVATION'));
  const contentCount = conservationContent.length;

  const stats = {
    homes: 180,
    years: 15,
    birdSpecies: 47,
    nativePlants: 150,
    residents: userCount,
    groups: groupCount,
    conservationArticles: contentCount,
  };

  return NextResponse.json(stats);
}
