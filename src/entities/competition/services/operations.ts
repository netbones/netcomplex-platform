import { TRPCError } from '@trpc/server';
import { and, eq, desc, asc, count, lte, gte, inArray } from 'drizzle-orm';
import { competitions, competitionEntries, users, notifications, db } from '@api/server';
import { createId } from '@shared/lib/id';
import type { InferSelectModel } from 'drizzle-orm';

type CompetitionEntry = InferSelectModel<typeof competitionEntries>;

function toParticipantDTO(entry: CompetitionEntry, user: { name: string; avatar: string | null }) {
  return {
    id: entry.id,
    userId: entry.userId,
    name: user.name,
    avatar: user.avatar || null,
    joinedAt: entry.joinedAt.toISOString(),
    status: entry.status,
    submissionUrl: entry.submissionUrl || null,
    submissionText: entry.submissionText || null,
    score: entry.score ?? null,
    winnerAt: entry.winnerAt?.toISOString() ?? null,
    prize: entry.prize || null,
  };
}

async function getParticipantCount(competitionId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(competitionEntries)
    .where(
      and(
        eq(competitionEntries.competitionId, competitionId),
        eq(competitionEntries.status, 'JOINED')
      )
    );
  return row?.total || 0;
}

async function getRecentParticipants(competitionId: string, limit: number) {
  const entries = await db
    .select()
    .from(competitionEntries)
    .where(
      and(
        eq(competitionEntries.competitionId, competitionId),
        eq(competitionEntries.status, 'JOINED')
      )
    )
    .orderBy(desc(competitionEntries.joinedAt))
    .limit(limit);

  const userIds = entries.map(e => e.userId);
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];

  return userRows.map(u => ({
    userId: u.id,
    name: u.name,
    avatar: u.avatar || null,
  }));
}

export async function findTenantCompetition(competitionId: string, tenantId: string) {
  const [comp] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, competitionId), eq(competitions.tenantId, tenantId)));
  if (!comp) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Competition not found' });
  }
  return comp;
}

export async function findActiveCompetitions(tenantId: string) {
  const now = new Date();
  const conditions = [
    eq(competitions.status, 'ACTIVE'),
    lte(competitions.startDate, now),
    gte(competitions.endDate, now),
  ];
  if (tenantId) {
    conditions.push(eq(competitions.tenantId, tenantId));
  }

  const comps = await db
    .select()
    .from(competitions)
    .where(and(...conditions))
    .orderBy(desc(competitions.startDate));

  return Promise.all(
    comps.map(async comp => {
      const participantCount = await getParticipantCount(comp.id);
      const topParticipants = await getRecentParticipants(comp.id, 3);

      return {
        id: comp.id,
        title: comp.title,
        description: comp.description || null,
        rules: comp.rules || null,
        prizeInfo: comp.prizeInfo || null,
        type: comp.type,
        startDate: comp.startDate.toISOString(),
        endDate: comp.endDate.toISOString(),
        status: comp.status,
        entryCount: comp.entryCount,
        maxParticipants: comp.maxParticipants || null,
        winnersCount: comp.winnersCount,
        image: comp.image || null,
        participantCount,
        topParticipants,
      };
    })
  );
}

export async function getCompetitionDetail(
  competitionId: string,
  tenantId?: string,
  userId?: string | null
) {
  const conditions = [eq(competitions.id, competitionId)];
  if (tenantId) {
    conditions.push(eq(competitions.tenantId, tenantId));
  }

  const [comp] = await db
    .select()
    .from(competitions)
    .where(and(...conditions));

  if (!comp) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Competition not found' });
  }

  const participantCount = await getParticipantCount(comp.id);
  const topParticipants = await getRecentParticipants(comp.id, 10);

  let currentUserEntry = null;
  if (userId) {
    const [entry] = await db
      .select()
      .from(competitionEntries)
      .where(
        and(eq(competitionEntries.competitionId, comp.id), eq(competitionEntries.userId, userId))
      )
      .limit(1);
    if (entry) {
      currentUserEntry = {
        id: entry.id,
        status: entry.status,
        submissionUrl: entry.submissionUrl || null,
        submissionText: entry.submissionText || null,
        joinedAt: entry.joinedAt.toISOString(),
      };
    }
  }

  return {
    id: comp.id,
    title: comp.title,
    description: comp.description || null,
    rules: comp.rules || null,
    prizeInfo: comp.prizeInfo || null,
    type: comp.type,
    startDate: comp.startDate.toISOString(),
    endDate: comp.endDate.toISOString(),
    status: comp.status,
    entryCount: comp.entryCount,
    maxParticipants: comp.maxParticipants || null,
    winnersCount: comp.winnersCount,
    image: comp.image || null,
    participantCount,
    topParticipants,
    currentUserEntry,
  };
}

async function validateCompetitionActive(competitionId: string, tenantId: string) {
  const comp = await findTenantCompetition(competitionId, tenantId);

  if (comp.status !== 'ACTIVE') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is not active' });
  }

  const now = new Date();
  if (now < comp.startDate || now > comp.endDate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Competition is not open for entries',
    });
  }

  return comp;
}

async function validateNotFull(competitionId: string, maxParticipants: number | null) {
  if (!maxParticipants) return;

  const [row] = await db
    .select({ total: count() })
    .from(competitionEntries)
    .where(eq(competitionEntries.competitionId, competitionId));

  if ((row?.total || 0) >= maxParticipants) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is full' });
  }
}

async function validateNotDuplicate(competitionId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(competitionEntries)
    .where(
      and(
        eq(competitionEntries.competitionId, competitionId),
        eq(competitionEntries.userId, userId)
      )
    );

  if (existing) {
    throw new TRPCError({ code: 'CONFLICT', message: 'Already joined this competition' });
  }
}

async function createEntry(
  competitionId: string,
  userId: string,
  extra: Partial<typeof competitionEntries.$inferInsert> = {}
) {
  const nowDate = new Date();
  const [entry] = await db
    .insert(competitionEntries)
    .values({
      id: createId(),
      competitionId,
      userId,
      status: 'JOINED',
      joinedAt: nowDate,
      createdAt: nowDate,
      updatedAt: nowDate,
      ...extra,
    })
    .returning();
  return entry;
}

async function incrementEntryCount(competitionId: string, currentCount: number) {
  await db
    .update(competitions)
    .set({ entryCount: currentCount + 1, updatedAt: new Date() })
    .where(eq(competitions.id, competitionId));
}

async function getUser(userId: string) {
  const [user] = await db
    .select({ name: users.name, avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId));
  return user || { name: 'Unknown', avatar: null };
}

export async function joinRaffle(competitionId: string, userId: string, tenantId: string) {
  const comp = await validateCompetitionActive(competitionId, tenantId);

  if (comp.type !== 'RAFFLE') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This competition type does not support direct joining',
    });
  }

  await validateNotFull(competitionId, comp.maxParticipants);
  await validateNotDuplicate(competitionId, userId);

  const entry = await createEntry(competitionId, userId);
  await incrementEntryCount(competitionId, comp.entryCount);

  const user = await getUser(userId);
  return toParticipantDTO(entry, user);
}

export async function submitPhotoEntry(
  competitionId: string,
  userId: string,
  tenantId: string,
  submissionUrl: string,
  submissionText?: string | null
) {
  const comp = await validateCompetitionActive(competitionId, tenantId);

  if (comp.type !== 'PHOTO') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This competition is not a photo contest',
    });
  }

  await validateNotFull(competitionId, comp.maxParticipants);
  await validateNotDuplicate(competitionId, userId);

  const entry = await createEntry(competitionId, userId, {
    submissionUrl: submissionUrl || null,
    submissionText: submissionText || null,
  });
  await incrementEntryCount(competitionId, comp.entryCount);

  const user = await getUser(userId);
  return toParticipantDTO(entry, user);
}

export async function listCompetitionParticipants(competitionId: string, tenantId: string) {
  await findTenantCompetition(competitionId, tenantId);

  const entries = await db
    .select()
    .from(competitionEntries)
    .where(eq(competitionEntries.competitionId, competitionId))
    .orderBy(desc(competitionEntries.joinedAt));

  const userIds = [...new Set(entries.map(e => e.userId))];
  const userMap = new Map<string, { name: string; avatar: string | null }>();

  if (userIds.length) {
    const userRows = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of userRows) {
      userMap.set(u.id, { name: u.name, avatar: u.avatar || null });
    }
  }

  const participants = entries.map(entry =>
    toParticipantDTO(entry, userMap.get(entry.userId) || { name: 'Unknown', avatar: null })
  );

  return { participants, total: participants.length };
}

async function findEntryInTenant(entryId: string, tenantId: string) {
  const [entry] = await db
    .select()
    .from(competitionEntries)
    .where(eq(competitionEntries.id, entryId));

  if (!entry) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
  }

  const [comp] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, entry.competitionId), eq(competitions.tenantId, tenantId)));

  if (!comp) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Competition not in your tenant' });
  }

  return { entry, comp };
}

export async function updateEntry(
  entryId: string,
  data: { score?: number; status?: string; prize?: string },
  tenantId: string
) {
  const { entry } = await findEntryInTenant(entryId, tenantId);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.score !== undefined) updateData.score = data.score;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.prize !== undefined) updateData.prize = data.prize;

  const [updated] = await db
    .update(competitionEntries)
    .set(updateData)
    .where(eq(competitionEntries.id, entryId))
    .returning();

  const user = await getUser(updated.userId);
  return toParticipantDTO(updated, user);
}

export async function markEntryWinner(
  entryId: string,
  prize: string | undefined,
  tenantId: string
) {
  const { entry, comp } = await findEntryInTenant(entryId, tenantId);

  const nowDate = new Date();
  const [updated] = await db
    .update(competitionEntries)
    .set({
      status: 'WINNER',
      winnerAt: nowDate,
      prize: prize || null,
      updatedAt: nowDate,
    })
    .where(eq(competitionEntries.id, entryId))
    .returning();

  await db.insert(notifications).values({
    id: createId(),
    tenantId,
    userId: updated.userId,
    title: `You won ${comp.title}!`,
    message: `Congratulations! You won ${comp.title}.`,
    type: 'info',
    link: `/competition/${comp.id}`,
    read: false,
    createdAt: nowDate,
  });

  const user = await getUser(updated.userId);
  return toParticipantDTO(updated, user);
}

export async function drawWinners(competitionId: string, tenantId: string, count: number) {
  const comp = await findTenantCompetition(competitionId, tenantId);

  if (comp.type !== 'RAFFLE') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Draw only available for RAFFLE competitions',
    });
  }

  const entries = await db
    .select()
    .from(competitionEntries)
    .where(
      and(eq(competitionEntries.competitionId, comp.id), eq(competitionEntries.status, 'JOINED'))
    );

  if (entries.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No participants to draw from' });
  }

  const drawCount = Math.min(count || comp.winnersCount, entries.length);
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, drawCount);
  const nowDate = new Date();
  const selectedIds = selected.map(e => e.id);

  const updatedEntries =
    selectedIds.length > 0
      ? await db
          .update(competitionEntries)
          .set({ status: 'WINNER', winnerAt: nowDate, updatedAt: nowDate })
          .where(inArray(competitionEntries.id, selectedIds))
          .returning()
      : [];

  if (selected.length > 0) {
    await db.insert(notifications).values(
      selected.map(entry => ({
        id: createId(),
        tenantId,
        userId: entry.userId,
        title: `You won ${comp.title}!`,
        message: `Congratulations! You won ${comp.title}.`,
        type: 'info' as const,
        link: `/competition/${comp.id}`,
        read: false,
        createdAt: nowDate,
      }))
    );
  }

  const userIds = updatedEntries.map(e => e.userId);
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u]));

  return updatedEntries.map(entry =>
    toParticipantDTO(entry, userMap.get(entry.userId) || { name: 'Unknown', avatar: null })
  );
}

export async function listCompetitionWinners(competitionId: string, tenantId?: string) {
  if (tenantId) {
    const [comp] = await db
      .select({ tenantId: competitions.tenantId })
      .from(competitions)
      .where(and(eq(competitions.id, competitionId), eq(competitions.tenantId, tenantId)));
    if (!comp) {
      return [];
    }
  }

  const winnerEntries = await db
    .select()
    .from(competitionEntries)
    .where(
      and(
        eq(competitionEntries.competitionId, competitionId),
        inArray(competitionEntries.status, ['WINNER', 'RUNNER_UP'] as const)
      )
    )
    .orderBy(asc(competitionEntries.winnerAt));

  if (!winnerEntries.length) return [];

  const userIds = [...new Set(winnerEntries.map(e => e.userId))];
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u]));

  return winnerEntries.map(entry => ({
    userId: entry.userId,
    name: userMap.get(entry.userId)?.name || 'Unknown',
    avatar: userMap.get(entry.userId)?.avatar || null,
    prize: entry.prize || null,
    rank: entry.status === 'WINNER' ? 'WINNER' : 'RUNNER_UP',
  }));
}
