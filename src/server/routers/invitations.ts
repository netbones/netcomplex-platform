import { z } from 'zod';
import {
  db,
  invitations,
  notDeleted,
  now,
  privilegedProcedure,
  publicProcedure,
  revalidateAdminChanges,
  router,
  sendEmail,
  templates,
  tenantProcedure,
  tenants,
  users,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { invitationDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { hasPermission, createComponentLogger } from '@shared/lib';

import { eq, and, desc, isNull } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

const IdInput = z.object({ id: z.string() });
const TokenInput = z.object({ token: z.string() });

const CreateInvitationInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  street: z.string().optional(),
  unit: z.string().optional(),
  residencyType: z.enum(['OWNER', 'TENANT', 'OCCUPANT']).optional().default('OWNER'),
  role: z.enum(['RESIDENT', 'ASSOCIATE', 'GROUP_ADMIN', 'PROVIDER']).optional().default('RESIDENT'),
  organizationId: z.string().optional(),
});

const ListInvitationsInput = z
  .object({
    status: z.string().optional(),
  })
  .optional();

function requireInvitePermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'users') && !hasPermission(role, 'admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to manage invitations',
    });
  }
}

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const inviteLogger = createComponentLogger('Invitations');

export const invitationsRouter = router({
  /**
   * List invitations for the current tenant.
   * @tenant
   */
  listInvitations: tenantProcedure
    .input(ListInvitationsInput)
    .meta({
      openapi: { method: 'GET', path: '/invitations/list', protect: true, tags: ['invitations'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const canViewAll = hasPermission(ctx.role, 'users') || hasPermission(ctx.role, 'admin');

      const conditions = [eq(invitations.tenantId, tenantId), notDeleted(invitations)];

      if (!canViewAll) {
        const [user] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, ctx.userId))
          .limit(1);
        if (user?.email) {
          conditions.push(eq(invitations.email, user.email));
        } else {
          return [];
        }
      }

      if (input?.status) {
        conditions.push(
          eq(invitations.status, input.status as (typeof invitations.status.enumValues)[number])
        );
      }

      const rows = await db
        .select()
        .from(invitations)
        .where(and(...conditions))
        .orderBy(desc(invitations.createdAt));

      return toEnvelope(rows.map(r => invitationDto.parse(r)));
    }),

  /**
   * Get a single invitation by ID.
   * @tenant
   */
  getInvitation: tenantProcedure
    .input(IdInput)
    .meta({
      openapi: { method: 'GET', path: '/invitations/get', protect: true, tags: ['invitations'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, input.id),
            eq(invitations.tenantId, tenantId),
            notDeleted(invitations)
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      const canViewAll = hasPermission(ctx.role, 'users') || hasPermission(ctx.role, 'admin');
      if (!canViewAll) {
        const [user] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, ctx.userId))
          .limit(1);
        if (user?.email !== invitation.email) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }

      return toEnvelope(invitationDto.parse(invitation));
    }),

  /**
   * Create a new invitation — staff only.
   * @privileged
   */
  createInvitation: privilegedProcedure
    .input(CreateInvitationInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/invitations/create',
        protect: true,
        tags: ['invitations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      requireInvitePermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.tenantId, tenantId),
            eq(invitations.email, input.email),
            eq(invitations.status, 'PENDING'),
            notDeleted(invitations)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An active invitation already exists for this email',
        });
      }

      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const [inviter] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      const token = createId();
      const acceptUrl = `${BETTER_AUTH_URL}/invite/${token}`;

      const [invitation] = await db
        .insert(invitations)
        .values({
          id: createId(),
          tenantId,
          email: input.email,
          name: input.name,
          street: input.street || null,
          unit: input.unit || null,
          residencyType: input.residencyType,
          role: input.role,
          inviterId: ctx.userId,
          organizationId: input.organizationId || ctx.organizationId || createId(),
          token,
          status: 'PENDING' as (typeof invitations.status.enumValues)[number],
          createdAt: now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();

      void sendEmail({
        to: input.email,
        subject: templates.teamInvitation.subject,
        html: templates.teamInvitation.getHtml(
          input.name,
          inviter?.name || 'A community member',
          tenant?.name || 'Soralia Village',
          acceptUrl,
          input.role
        ),
      }).catch(err => {
        inviteLogger.error({ email: input.email }, 'Failed to send invitation email', err);
      });

      revalidateAdminChanges();

      return toEnvelope(invitationDto.parse(invitation));
    }),

  /**
   * Cancel/revoke an invitation — staff only.
   * @privileged
   */
  cancelInvitation: privilegedProcedure
    .input(IdInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/invitations/cancel',
        protect: true,
        tags: ['invitations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      requireInvitePermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, input.id),
            eq(invitations.tenantId, tenantId),
            notDeleted(invitations)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      await db
        .update(invitations)
        .set({ deletedAt: now(), status: 'REVOKED' })
        .where(eq(invitations.id, input.id));

      revalidateAdminChanges();

      return toEnvelope({ success: true });
    }),

  /**
   * Accept an invitation via public token — no auth required.
   * @public
   */
  acceptInvitation: publicProcedure
    .input(TokenInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/invitations/accept',
        protect: false,
        tags: ['invitations'],
      },
    })
    .mutation(async ({ input }) => {
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation token' });
      }

      if (now() > invitation.expiresAt) {
        await db
          .update(invitations)
          .set({ status: 'EXPIRED' })
          .where(eq(invitations.id, invitation.id));
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' });
      }

      if (invitation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invitation is no longer pending (status: ${invitation.status})`,
        });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      if (existingUser) {
        const isProviderInvite = invitation.role === 'PROVIDER';

        if (!isProviderInvite && !hasPermission(existingUser.role, 'users')) {
          await db
            .update(users)
            .set({ role: invitation.role })
            .where(eq(users.id, existingUser.id));
        }

        await db
          .update(invitations)
          .set({ status: 'ACCEPTED' })
          .where(eq(invitations.id, invitation.id));

        return toEnvelope({
          success: true,
          message: 'Invitation accepted. You have been added to the community.',
          role: invitation.role,
          tenantId: invitation.tenantId,
        });
      }

      return toEnvelope({
        success: true,
        requiresSignup: true,
        invitation: {
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          tenantId: invitation.tenantId,
          token: invitation.token,
        },
      });
    }),

  /**
   * Validate an invitation token — no auth required.
   * @public
   */
  validateInvitation: publicProcedure
    .input(TokenInput)
    .meta({
      openapi: {
        method: 'GET',
        path: '/invitations/validate',
        protect: false,
        tags: ['invitations'],
      },
    })
    .query(async ({ input }) => {
      const [invitation] = await db
        .select({
          id: invitations.id,
          email: invitations.email,
          name: invitations.name,
          role: invitations.role,
          residencyType: invitations.residencyType,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          tenantId: invitations.tenantId,
          inviterId: invitations.inviterId,
        })
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation token' });
      }

      if (now() > invitation.expiresAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' });
      }

      if (invitation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invitation is no longer pending (status: ${invitation.status})`,
        });
      }

      const [tenant] = await db
        .select({ name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, invitation.tenantId))
        .limit(1);

      const [inviter] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, invitation.inviterId))
        .limit(1);

      const [existingUser] = await db
        .select({ id: users.id, name: users.name, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      return toEnvelope({
        invitation: {
          ...invitation,
          expiresAt: invitation.expiresAt?.toISOString() ?? null,
          tenantName: tenant?.name || 'Soralia Village',
          tenantSlug: tenant?.slug,
          inviterName: inviter?.name || 'A community member',
        },
        existingUser: existingUser
          ? {
              id: existingUser.id,
              name: existingUser.name,
              emailVerified: existingUser.emailVerified,
            }
          : null,
      });
    }),

  /**
   * Resend an invitation email — staff only.
   * @privileged
   */
  resendInvitation: privilegedProcedure
    .input(IdInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/invitations/resend',
        protect: true,
        tags: ['invitations'],
      },
    })
    .mutation(async ({ input, ctx }) => {
      requireInvitePermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, input.id),
            eq(invitations.tenantId, tenantId),
            notDeleted(invitations)
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      if (invitation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot resend — invitation status is ${invitation.status}`,
        });
      }

      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const [inviter] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      const token = createId();
      const acceptUrl = `${BETTER_AUTH_URL}/invite/${token}`;

      await db
        .update(invitations)
        .set({
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .where(eq(invitations.id, input.id));

      void sendEmail({
        to: invitation.email,
        subject: templates.teamInvitation.subject,
        html: templates.teamInvitation.getHtml(
          invitation.name,
          inviter?.name || 'A community member',
          tenant?.name || 'Soralia Village',
          acceptUrl,
          invitation.role
        ),
      }).catch(err => {
        inviteLogger.error(
          { email: invitation.email, invitationId: input.id },
          'Failed to resend invitation email',
          err
        );
      });

      return toEnvelope({ success: true, message: 'Invitation email resent' });
    }),
});
