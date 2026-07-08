import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  router,
  tenantProcedure,
  db,
  agentAccesses,
  agentProfiles,
  properties,
  users,
  delegationActions,
  agentTokens,
} from '@api/server';
import { signAgentToken, hashToken } from '@shared/lib/agent-token';
import { createPrefixedId } from '@shared/lib/id';
import { logDelegationAction } from '@api/shared/delegations';
import type { AgentScopeConfig } from '@entities/agent';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED'] as const;
type DelegationStatus = (typeof VALID_STATUSES)[number];

function isDelegationStatus(s: string): s is DelegationStatus {
  return VALID_STATUSES.includes(s as DelegationStatus);
}

function buildApiScopes(permissions: string[]): string[] {
  const map: Record<string, string[]> = {
    'listing:read': ['properties:read'],
    'listing:manage': ['properties:write'],
    'listing:market': ['marketplace:write'],
    'maintenance:manage': ['maintenance:write'],
    'maintenance:coordinate': ['maintenance:write'],
    'financials:read': ['finances:read'],
    'financials:collect': ['finances:write'],
    'tenancy:manage': ['tenancy:write'],
    'communication:contact_occupant': ['messages:write'],
  };
  const apis = new Set<string>();
  for (const p of permissions) {
    (map[p] ?? []).forEach(a => apis.add(a));
  }
  return [...apis];
}

function getWriteActions(permissions: string[]): string[] {
  const writeScopes = [
    'maintenance:manage',
    'maintenance:coordinate',
    'maintenance:create',
    'listing:manage',
    'listing:market',
    'financials:collect',
    'tenancy:manage',
    'inspection:record',
    'documents:upload',
    'communication:contact_occupant',
  ];
  const hasWrite = permissions.some(p => writeScopes.includes(p));
  return hasWrite ? ['write'] : [];
}

export const delegationsRouter = router({
  listDelegations: tenantProcedure
    .input(
      z
        .object({
          propertyId: z.string().optional(),
          status: z.string().optional(),
          agentId: z.string().optional(),
        })
        .optional()
    )
    .meta({
      openapi: { method: 'GET', path: '/delegations/list', protect: true, tags: ['delegations'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (input?.status && !isDelegationStatus(input.status.toUpperCase())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid status: ${input.status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const statusFilter = input?.status
        ? (input.status.toUpperCase() as DelegationStatus)
        : undefined;

      const conditions = [eq(agentAccesses.tenantId, tenantId)];

      if (input?.propertyId) conditions.push(eq(agentAccesses.propertyId, input.propertyId));
      if (statusFilter) conditions.push(eq(agentAccesses.status, statusFilter));
      if (input?.agentId) conditions.push(eq(agentAccesses.agentId, input.agentId));

      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');
      if (!isAdmin) {
        conditions.push(eq(agentAccesses.grantedById, ctx.userId));
      }

      const delegations = await db
        .select({
          id: agentAccesses.id,
          propertyId: agentAccesses.propertyId,
          agentId: agentAccesses.agentId,
          grantedById: agentAccesses.grantedById,
          permissions: agentAccesses.permissions,
          status: agentAccesses.status,
          startedAt: agentAccesses.startedAt,
          expiresAt: agentAccesses.expiresAt,
          acceptedAt: agentAccesses.acceptedAt,
          rejectedAt: agentAccesses.rejectedAt,
          createdAt: agentAccesses.createdAt,
        })
        .from(agentAccesses)
        .where(and(...conditions))
        .orderBy(desc(agentAccesses.createdAt))
        .limit(100);

      const propertyIds = [...new Set(delegations.map(d => d.propertyId))];
      const agentIds = [
        ...new Set([...delegations.map(d => d.agentId), ...delegations.map(d => d.grantedById)]),
      ];

      const propertyRecords =
        propertyIds.length > 0
          ? await db
              .select({ id: properties.id, street: properties.street, unit: properties.unit })
              .from(properties)
              .where(eq(properties.tenantId, tenantId))
          : [];

      const userRecords =
        agentIds.length > 0
          ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
          : [];

      const propertyMap = new Map(propertyRecords.map(p => [p.id, p]));
      const userMap = new Map(userRecords.map(u => [u.id, u]));

      return delegations.map(d => {
        const prop = propertyMap.get(d.propertyId);
        const agent = userMap.get(d.agentId);
        const grantor = userMap.get(d.grantedById);

        return {
          id: d.id,
          propertyId: d.propertyId,
          propertyAddress: prop ? `${prop.street}${prop.unit ? ` ${prop.unit}` : ''}` : null,
          agentId: d.agentId,
          agentName: agent?.name ?? null,
          agentEmail: agent?.email ?? null,
          grantedById: d.grantedById,
          grantedByName: grantor?.name ?? null,
          permissions: d.permissions,
          status: d.status,
          startedAt: d.startedAt.toISOString(),
          expiresAt: d.expiresAt.toISOString(),
          acceptedAt: d.acceptedAt?.toISOString() ?? null,
          rejectedAt: d.rejectedAt?.toISOString() ?? null,
          createdAt: d.createdAt.toISOString(),
          blocked: !d.permissions.includes('communication:contact_occupant'),
        };
      });
    }),

  acceptDelegation: tenantProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/delegations/accept',
        protect: true,
        tags: ['delegations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [delegation] = await db
        .select({
          id: agentAccesses.id,
          tenantId: agentAccesses.tenantId,
          agentId: agentAccesses.agentId,
          propertyId: agentAccesses.propertyId,
          status: agentAccesses.status,
          permissions: agentAccesses.permissions,
          expiresAt: agentAccesses.expiresAt,
        })
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.id))
        .limit(1);

      if (!delegation || delegation.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      if (delegation.agentId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the delegated provider can accept this delegation',
        });
      }

      if (delegation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot accept a ${delegation.status.toLowerCase()} delegation`,
        });
      }

      if (new Date(delegation.expiresAt) < new Date()) {
        await db
          .update(agentAccesses)
          .set({ status: 'EXPIRED', updatedAt: new Date() })
          .where(eq(agentAccesses.id, input.id));

        await logDelegationAction({
          tenantId,
          delegationId: input.id,
          action: 'expired',
          actorId: 'system',
          metadata: { autoExpiredAt: new Date().toISOString() },
        });

        throw new TRPCError({ code: 'NOT_FOUND', message: 'This delegation has expired' });
      }

      const [agentProfile] = await db
        .select({ isVerified: agentProfiles.isVerified })
        .from(agentProfiles)
        .where(eq(agentProfiles.agentId, ctx.userId))
        .limit(1);

      if (!agentProfile || !agentProfile.isVerified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only verified providers can accept delegations',
        });
      }

      const maxDurationSec = Math.ceil(
        (new Date(delegation.expiresAt).getTime() - Date.now()) / 1000
      );

      const scope: AgentScopeConfig = {
        spaces: ['services'],
        pages: delegation.permissions.map(p => p.toLowerCase()),
        apis: buildApiScopes(delegation.permissions),
        dataDomains: delegation.permissions.map(p => p.toLowerCase()),
        actions: ['read', ...getWriteActions(delegation.permissions)],
        maxDuration: maxDurationSec > 0 ? maxDurationSec : 86400 * 90,
      };

      await db
        .update(agentAccesses)
        .set({
          status: 'ACTIVE',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentAccesses.id, input.id));

      const tokenId = createPrefixedId('dt');
      const rawToken = await signAgentToken({
        agentId: delegation.agentId,
        tokenId,
        tenantId,
        callerType: 'delegated',
        scope,
        delegationId: input.id,
        expiresInSeconds: scope.maxDuration,
      });

      const tokenHash = hashToken(rawToken);

      await db.insert(agentTokens).values({
        id: tokenId,
        tenantId,
        agentId: delegation.agentId,
        issuedById: ctx.userId,
        accessId: input.id,
        name: `Delegation token for property ${delegation.propertyId}`,
        tokenHash,
        scope,
        expiresAt: new Date(Date.now() + scope.maxDuration * 1000),
      });

      await logDelegationAction({
        tenantId,
        delegationId: input.id,
        action: 'accepted',
        actorId: ctx.userId,
        metadata: { tokenId },
      });

      await logDelegationAction({
        tenantId,
        delegationId: input.id,
        action: 'token_issued',
        actorId: ctx.userId,
        metadata: { tokenId },
      });

      return {
        id: input.id,
        status: 'ACTIVE',
        token: rawToken,
        tokenId,
        expiresAt: new Date(Date.now() + scope.maxDuration * 1000).toISOString(),
      };
    }),

  getDelegationAudit: tenantProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      openapi: { method: 'GET', path: '/delegations/audit', protect: true, tags: ['delegations'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [delegation] = await db
        .select({
          id: agentAccesses.id,
          tenantId: agentAccesses.tenantId,
          grantedById: agentAccesses.grantedById,
          agentId: agentAccesses.agentId,
        })
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.id))
        .limit(1);

      if (!delegation || delegation.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      const isOwner = delegation.grantedById === ctx.userId;
      const isAgent = delegation.agentId === ctx.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');
      if (!isOwner && !isAgent && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const entries = await db
        .select({
          id: delegationActions.id,
          delegationId: delegationActions.delegationId,
          action: delegationActions.action,
          actorId: delegationActions.actorId,
          metadata: delegationActions.metadata,
          createdAt: delegationActions.createdAt,
        })
        .from(delegationActions)
        .where(eq(delegationActions.delegationId, input.id))
        .orderBy(desc(delegationActions.createdAt))
        .limit(50);

      return entries.map(e => ({
        id: e.id,
        delegationId: e.delegationId,
        action: e.action,
        actorId: e.actorId,
        metadata: e.metadata as Record<string, unknown> | null,
        createdAt: e.createdAt.toISOString(),
      }));
    }),

  blockDelegation: tenantProcedure
    .input(z.object({ id: z.string(), blocked: z.boolean() }))
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/delegations/block',
        protect: true,
        tags: ['delegations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [delegation] = await db
        .select({
          id: agentAccesses.id,
          tenantId: agentAccesses.tenantId,
          propertyId: agentAccesses.propertyId,
          permissions: agentAccesses.permissions,
          originalPermissions: agentAccesses.originalPermissions,
          grantedById: agentAccesses.grantedById,
        })
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.id))
        .limit(1);

      if (!delegation || delegation.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      const [property] = await db
        .select({ id: properties.id, ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, delegation.propertyId))
        .limit(1);

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const isOwner = property.ownerId === ctx.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the property resident or admin can block agent contact',
        });
      }

      const currentPermissions = delegation.permissions;
      const originalPermissions = delegation.originalPermissions ?? currentPermissions;
      let newPermissions: string[];

      if (input.blocked) {
        newPermissions = currentPermissions.filter(p => p !== 'communication:contact_occupant');
      } else {
        if (
          originalPermissions.includes('communication:contact_occupant') &&
          !currentPermissions.includes('communication:contact_occupant')
        ) {
          newPermissions = [...currentPermissions, 'communication:contact_occupant'];
        } else {
          newPermissions = currentPermissions;
        }
      }

      await db
        .update(agentAccesses)
        .set({ permissions: newPermissions, updatedAt: new Date() })
        .where(eq(agentAccesses.id, input.id));

      await logDelegationAction({
        tenantId,
        delegationId: input.id,
        action: input.blocked ? 'blocked' : 'unblocked',
        actorId: ctx.userId,
        metadata: {
          previousPermissions: currentPermissions,
          newPermissions,
        },
      });

      return {
        id: input.id,
        blocked: input.blocked,
        permissions: newPermissions,
      };
    }),

  rejectDelegation: tenantProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/delegations/reject',
        protect: true,
        tags: ['delegations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [delegation] = await db
        .select({
          id: agentAccesses.id,
          tenantId: agentAccesses.tenantId,
          agentId: agentAccesses.agentId,
          status: agentAccesses.status,
        })
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.id))
        .limit(1);

      if (!delegation || delegation.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      if (delegation.agentId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the delegated provider can reject this delegation',
        });
      }

      if (delegation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot reject a ${delegation.status.toLowerCase()} delegation`,
        });
      }

      await db
        .update(agentAccesses)
        .set({ status: 'REJECTED', rejectedAt: new Date(), updatedAt: new Date() })
        .where(eq(agentAccesses.id, input.id));

      await logDelegationAction({
        tenantId,
        delegationId: input.id,
        action: 'rejected',
        actorId: ctx.userId,
      });

      return { id: input.id, status: 'REJECTED' };
    }),

  revokeDelegation: tenantProcedure
    .input(z.object({ id: z.string() }))
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/delegations/revoke',
        protect: true,
        tags: ['delegations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [delegation] = await db
        .select({
          id: agentAccesses.id,
          tenantId: agentAccesses.tenantId,
          grantedById: agentAccesses.grantedById,
          status: agentAccesses.status,
        })
        .from(agentAccesses)
        .where(eq(agentAccesses.id, input.id))
        .limit(1);

      if (!delegation || delegation.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      const isOwner = delegation.grantedById === ctx.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the property owner or admin can revoke this delegation',
        });
      }

      if (delegation.status !== 'ACTIVE' && delegation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot revoke a ${delegation.status.toLowerCase()} delegation`,
        });
      }

      await db
        .update(agentAccesses)
        .set({ status: 'REVOKED', revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(agentAccesses.id, input.id));

      await db
        .update(agentTokens)
        .set({ revokedAt: new Date() })
        .where(eq(agentTokens.accessId, input.id));

      await logDelegationAction({
        tenantId,
        delegationId: input.id,
        action: 'revoked',
        actorId: ctx.userId,
        metadata: { revokedBy: isAdmin ? 'admin' : 'owner' },
      });

      return { id: input.id, status: 'REVOKED' };
    }),
});
