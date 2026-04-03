import { db, conversations, conversationParticipants, users } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  const body = await request.json();
  const { participantIds } = body;

  if (!participantIds || participantIds.length < 2) {
    return NextResponse.json({ error: 'Two participant IDs required' }, { status: 400 });
  }

  // Check if direct conversation already exists with exactly these two participants
  const existing = (await db.execute(sql`
    SELECT c.*,
      json_agg(
        json_build_object(
          'id', cp.id,
          'userId', cp."userId",
          'user', json_build_object('id', u.id, 'name', u.name, 'avatar', u.image)
        )
      ) FILTER (WHERE cp.id IS NOT NULL) as participants
    FROM "conversation" c
    JOIN "conversationParticipant" cp ON cp."conversationId" = c.id
    JOIN "user" u ON u.id = cp."userId"
    WHERE c.type = 'DIRECT'
    AND cp."userId" IN ${sql`${participantIds}`}
    GROUP BY c.id
    HAVING COUNT(DISTINCT cp."userId") = 2
  `)) as any;

  // Filter to ensure exactly 2 participants
  const validConversation = (existing.rows?.length || 0) > 0 ? existing.rows[0] : null;

  if (validConversation) {
    return NextResponse.json({ conversation: validConversation });
  }

  // Create new direct conversation
  const newConversation = (await db.execute(sql`
    INSERT INTO "conversation" (name, type)
    VALUES (NULL, 'DIRECT')
    RETURNING *
  `)) as any;

  const conversationId = newConversation.rows?.[0]?.id;

  // Create participants
  for (const userId of participantIds) {
    await db.execute(sql`
      INSERT INTO "conversationParticipant" ("conversationId", "userId")
      VALUES (${conversationId}, ${userId})
    `);
  }

  // Get the conversation with participants
  const result = (await db.execute(sql`
    SELECT c.*,
      json_agg(
        json_build_object(
          'id', cp.id,
          'userId', cp."userId",
          'user', json_build_object('id', u.id, 'name', u.name, 'avatar', u.image)
        )
      ) FILTER (WHERE cp.id IS NOT NULL) as participants
    FROM "conversation" c
    JOIN "conversationParticipant" cp ON cp."conversationId" = c.id
    JOIN "user" u ON u.id = cp."userId"
    WHERE c.id = ${conversationId}
    GROUP BY c.id
  `)) as any;

  return NextResponse.json({ conversation: result.rows?.[0] }, { status: 201 });
}
