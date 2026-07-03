import { z } from 'zod';
import {
  router,
  tenantProcedure,
  privilegedProcedure,
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
import { toEnvelope } from '@api/server';
import { settingDto } from '@api/server';
import { notDeleted } from '@api/server';

const SettingByKeyInput = z.object({ key: z.string() });
const UpsertSettingInput = z.object({
  key: z.string().min(1),
  value: z.string(),
});
const DeleteSettingInput = z.object({ key: z.string() });

export const settingsRouter = router({
  /**
   * List all settings for the current tenant.
   * @tenant
   */
  listSettings: tenantProcedure
    .meta({ openapi: { method: 'GET', path: '/settings/list', protect: true, tags: ['settings'] } })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const rows = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), notDeleted(settings)))
        .orderBy(settings.key);

      return toEnvelope(rows.map(r => settingDto.parse(r)));
    }),

  /**
   * Get a single setting by key.
   * @tenant
   */
  getSetting: tenantProcedure
    .input(SettingByKeyInput)
    .meta({ openapi: { method: 'GET', path: '/settings/get', protect: true, tags: ['settings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [setting] = await db
        .select()
        .from(settings)
        .where(
          and(eq(settings.tenantId, tenantId), eq(settings.key, input.key), notDeleted(settings))
        )
        .limit(1);

      return toEnvelope(setting ? settingDto.parse(setting) : { key: input.key, value: null });
    }),

  /**
   * Upsert a setting value — staff only.
   * @privileged
   */
  upsertSetting: privilegedProcedure
    .input(UpsertSettingInput)
    .meta({
      openapi: { method: 'POST', path: '/settings/upsert', protect: true, tags: ['settings'] },
    })
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId;

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

      let result: typeof settings.$inferSelect;

      if (existing) {
        const [updated] = await db
          .update(settings)
          .set({ value: input.value, updatedAt: now() })
          .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
          .returning();

        result = updated;
      } else {
        const id = `${tenantId}_${input.key}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const [created] = await db
          .insert(settings)
          .values({ id, tenantId, key: input.key, value: input.value })
          .returning();

        result = created;
      }

      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: ctx.userId,
        tenantId,
        details: { key: input.key, oldValue, newValue: input.value, method: 'tRPC' },
      });

      revalidateAdminChanges();
      return toEnvelope(settingDto.parse(result));
    }),

  /**
   * Delete a setting — staff only.
   * @privileged
   */
  deleteSetting: privilegedProcedure
    .input(DeleteSettingInput)
    .meta({
      openapi: { method: 'DELETE', path: '/settings/delete', protect: true, tags: ['settings'] },
    })
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Setting not found' });
      }

      await db
        .update(settings)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)));

      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: ctx.userId,
        tenantId,
        details: { key: input.key, oldValue: existing.value, newValue: null, method: 'tRPC' },
      });

      revalidateAdminChanges();
      return toEnvelope({ success: true });
    }),

  /**
   * Get contact settings — staff only.
   * @privileged
   */
  getContactSettings: privilegedProcedure
    .meta({
      openapi: { method: 'GET', path: '/settings/contact', protect: true, tags: ['settings'] },
    })
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId;

      const rows = await db
        .select()
        .from(settings)
        .where(and(eq(settings.tenantId, tenantId), notDeleted(settings)));

      const map = rows.reduce<Record<string, string>>((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      return toEnvelope(map);
    }),
});
