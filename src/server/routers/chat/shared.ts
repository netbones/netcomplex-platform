import { z } from 'zod';
import {
  protectedProcedure,
  adminProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { conversationDto, conversationDetailDto, messageDto, unreadCountsDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, or, desc, ne, gt, count, isNull, lt, sql, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export {
  z,
  protectedProcedure,
  adminProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
  toEnvelope,
  conversationDto,
  conversationDetailDto,
  messageDto,
  unreadCountsDto,
  TRPCError,
  hasPermission,
  eq,
  and,
  or,
  desc,
  ne,
  gt,
  count,
  isNull,
  lt,
  sql,
  inArray,
  SQL,
};

export async function checkParticipant(conversationId: string, userId: string, tenantId: string) {
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.tenantId, tenantId)
      )
    )
    .limit(1);
  return participant;
}
