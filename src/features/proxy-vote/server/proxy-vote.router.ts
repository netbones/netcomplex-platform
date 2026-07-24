import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { moduleProcedure, router, tenantProcedure, privilegedModuleProcedure } from '@api/server';

import {
  approveProxySchema,
  createProxySchema,
  rejectProxySchema,
  signProxySchema,
  updateProxySchema,
} from '@/features/proxy-vote/model/proxy-vote.zod';
import { proxyResponseDTO, type MeetingProxyDTO } from '@/features/proxy-vote/model/proxy-vote.dto';

import { proxyCrudService } from './proxy-crud.service';
import { proxyNotifyService } from './proxy-notify.service';

const IdInput = z.object({ proxyId: z.string() });
const MeetingIdInput = z.object({ meetingId: z.string() });

function unwrap<T>(value: T): T {
  return value;
}

function toDTO(row: unknown): MeetingProxyDTO {
  return proxyResponseDTO(row as Parameters<typeof proxyResponseDTO>[0]);
}

function ownerHouseholdIdFromCtx(ctx: { session: { user: { id: string } } | null }): string {
  void ctx;
  return '';
}

export const proxyVoteRouter = router({
  create: moduleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(createProxySchema)
    .mutation(async ({ input, ctx }) => {
      const ownerUserId = ctx.session?.user.id;
      if (!ownerUserId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }
      const ownerHouseholdId = ownerHouseholdIdFromCtx(ctx);
      const row = await proxyCrudService.createProxy({
        input,
        ownerUserId,
        ownerHouseholdId,
        tenantId: ctx.tenantId,
      });
      await proxyNotifyService.notifyProxyNominated(row, '', '');
      await proxyNotifyService.notifyHoaNewProxy(row, '');
      return toDTO(row);
    }),

  getById: tenantProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const row = await proxyCrudService.getProxyById(input.proxyId, unwrap(ctx.tenantId));
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'MeetingProxy not found' });
    }
    return toDTO(row);
  }),

  getByMeeting: tenantProcedure.input(MeetingIdInput).query(async ({ input, ctx }) => {
    const rows = await proxyCrudService.getProxiesByMeeting(input.meetingId, unwrap(ctx.tenantId));
    return rows.map(toDTO);
  }),

  update: moduleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(z.object({ proxyId: z.string(), ...updateProxySchema.shape }))
    .mutation(async ({ input, ctx }) => {
      const ownerUserId = ctx.session?.user.id;
      if (!ownerUserId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      const { proxyId, ...patch } = input;
      const row = await proxyCrudService.updateProxy(
        proxyId,
        patch,
        ownerUserId,
        unwrap(ctx.tenantId)
      );
      return toDTO(row);
    }),

  sign: moduleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(IdInput.merge(signProxySchema))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      const row = await proxyCrudService.signProxy(
        input.proxyId,
        { signatureEvidence: input.signatureEvidence },
        userId,
        unwrap(ctx.tenantId)
      );
      await proxyNotifyService.notifyHoaReadyForReview(row);
      return toDTO(row);
    }),

  approve: privilegedModuleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(z.object({ proxyId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      const row = await proxyCrudService.approveProxy(
        input.proxyId,
        userId,
        unwrap(ctx.tenantId),
        input.notes
      );
      await proxyNotifyService.notifyOwnerApproved(row);
      return toDTO(row);
    }),

  reject: privilegedModuleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(IdInput.merge(rejectProxySchema))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      const row = await proxyCrudService.rejectProxy(
        input.proxyId,
        userId,
        unwrap(ctx.tenantId),
        input.notes
      );
      await proxyNotifyService.notifyOwnerRejected(row);
      return toDTO(row);
    }),

  withdraw: moduleProcedure
    .meta({ requiredModule: 'proxyVote' })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session required' });
      }
      const row = await proxyCrudService.withdrawProxy(input.proxyId, userId, unwrap(ctx.tenantId));
      return toDTO(row);
    }),
});
