import {
  db,
  apiCreated,
  apiError,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  withErrorHandler,
} from '@api/server';

import { sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

interface ConversationResult {
  id: string;
  name: string | null;
  type: string;
  [key: string]: unknown;
}

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();

  const { tenantId } = await withTenant();
  const body = await request.json();
  const { participantIds } = body;

  if (!participantIds || participantIds.length < 2) {
    return apiError('VALIDATION_ERROR', 'Two participant IDs required', 400);
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
    FROM "Conversation" c
    JOIN "ConversationParticipant" cp ON cp."conversationId" = c.id
    JOIN "user" u ON u.id = cp."userId"
    WHERE c.type = 'DIRECT'
    AND c."tenantId" = ${tenantId}
    AND cp."userId" IN ${sql`${participantIds}`}
    GROUP BY c.id
    HAVING COUNT(DISTINCT cp."userId") = 2
  `)) as { rows: ConversationResult[] };

  // Filter to ensure exactly 2 participants
  const validConversation = (existing.rows?.length || 0) > 0 ? existing.rows[0] : null;

  if (validConversation) {
    return apiSuccess({ conversation: validConversation });
  }

  // Create new direct conversation
  const conversationId = crypto.randomUUID();
  const newConversation = (await db.execute(sql`
    INSERT INTO "Conversation" (id, name, type, "tenantId")
    VALUES (${conversationId}, NULL, 'DIRECT', ${tenantId})
    RETURNING *
  `)) as { rows: ConversationResult[] };

  // Create participants
  for (const userId of participantIds) {
    await db.execute(sql`
      INSERT INTO "ConversationParticipant" (id, "conversationId", "userId", "tenantId")
      VALUES (${crypto.randomUUID()}, ${conversationId}, ${userId}, ${tenantId})
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
    FROM "Conversation" c
    JOIN "ConversationParticipant" cp ON cp."conversationId" = c.id
    JOIN "user" u ON u.id = cp."userId"
    WHERE c.id = ${conversationId}
    AND c."tenantId" = ${tenantId}
    GROUP BY c.id
  `)) as { rows: ConversationResult[] };

  return apiSuccess({ conversation: result.rows?.[0] }, undefined, 201);
});
