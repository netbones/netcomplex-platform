import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  settings,
  writeAuditLog,
  revalidateAdminChanges,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { validateSettingValue } from '@shared/lib/settings/validation';

const SettingByKeyInput = z.object({ key: z.string() });

const UpsertSettingInput = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const DeleteSettingInput = z.object({ key: z.string() });

export const settingsRouter = router({
  listSettings: protectedProcedure
    .meta({ openapi: { method: 'GET', path: '/settings/list', protect: true, tags: ['settings'] } })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      return db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tenantId))
        .orderBy(settings.key);
    }),

  getSetting: protectedProcedure
    .input(SettingByKeyInput)
    .meta({ openapi: { method: 'GET', path: '/settings/get', protect: true, tags: ['settings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [setting] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
        .limit(1);

      return setting ?? { key: input.key, value: null };
    }),

  upsertSetting: protectedProcedure
    .input(UpsertSettingInput)
    .meta({
      openapi: { method: 'POST', path: '/settings/upsert', protect: true, tags: ['settings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const validation = validateSettingValue(input.key, input.value);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.error ?? 'Invalid setting value',
        });
      }

      const [existing] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
        .limit(1);

      const oldValue = existing?.value ?? null;

      if (existing) {
        const [updated] = await db
          .update(settings)
          .set({ value: input.value, updatedAt: now() })
          .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
          .returning();

        writeAuditLog({
          action: 'SETTINGS_CHANGED',
          actorId: ctx.userId,
          tenantId,
          details: { key: input.key, oldValue, newValue: input.value, method: 'tRPC' },
        });

        revalidateAdminChanges();
        return updated;
      }

      const id = `${tenantId}_${input.key}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      const [created] = await db
        .insert(settings)
        .values({ id, tenantId, key: input.key, value: input.value })
        .returning();

      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: ctx.userId,
        tenantId,
        details: { key: input.key, oldValue: null, newValue: input.value, method: 'tRPC' },
      });

      revalidateAdminChanges();
      return created;
    }),

  deleteSetting: protectedProcedure
    .input(DeleteSettingInput)
    .meta({
      openapi: { method: 'DELETE', path: '/settings/delete', protect: true, tags: ['settings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const [existing] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Setting not found' });
      }

      await db
        .delete(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)));

      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: ctx.userId,
        tenantId,
        details: { key: input.key, oldValue: existing.value, newValue: null, method: 'tRPC' },
      });

      revalidateAdminChanges();

      return { success: true };
    }),

  getContactSettings: protectedProcedure
    .meta({
      openapi: { method: 'GET', path: '/settings/contact', protect: true, tags: ['settings'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

      return rows.reduce<Record<string, string>>((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
    }),
});
