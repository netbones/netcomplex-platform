import { z } from 'zod';
import {
  router,
  publicProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  bursaries,
  bursaryFields,
  resources,
  settings,
  notDeleted,
  now,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@shared/lib/id';
import { bursaryCreateSchema } from '@entities/education';

const EDUCATION_DEFAULTS = {
  bursaries: [] as Array<unknown>,
  resources: [] as Array<unknown>,
};

function tenantIdOrThrow(tenantId: string | null): string {
  if (!tenantId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Tenant context required',
    });
  }
  return tenantId;
}

function parseSettingsJson(value: string | null | undefined) {
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      /* fall through */
    }
  }
  return null;
}

export const educationRouter = router({
  getEducationData: publicProcedure.query(async ({ ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
    const existing = rows.find(s => s.key === 'education_data');

    const parsed = parseSettingsJson(existing?.value);
    return parsed ?? EDUCATION_DEFAULTS;
  }),

  updateEducationData: privilegedProcedure
    .input(
      z.object({
        bursaries: z.array(z.unknown()),
        resources: z.array(z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;
      const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
      const existing = rows.find(s => s.key === 'education_data');

      const ts = now();
      const data = JSON.stringify({ bursaries: input.bursaries, resources: input.resources });

      if (existing) {
        await db
          .update(settings)
          .set({ value: data, updatedAt: ts })
          .where(eq(settings.id, existing.id));
      } else {
        await db.insert(settings).values({
          id: createId(),
          tenantId,
          key: 'education_data',
          value: data,
          schemaVersion: 1,
          createdAt: ts,
          updatedAt: ts,
        });
      }

      return { bursaries: input.bursaries, resources: input.resources };
    }),

  listBursaries: publicProcedure.query(async ({ ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const rows = await db
      .select()
      .from(bursaries)
      .where(and(eq(bursaries.tenantId, tenantId), notDeleted(bursaries)))
      .orderBy(desc(bursaries.deadline));

    return rows;
  }),

  createBursary: privilegedProcedure.input(bursaryCreateSchema).mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.role, 'admin')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
    }

    const tenantId = ctx.tenantId!;

    const [field] = await db
      .select()
      .from(bursaryFields)
      .where(eq(bursaryFields.id, input.fieldId))
      .limit(1);

    if (!field) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'BursaryField not found' });
    }

    const id = createId();
    const ts = new Date();
    await db.insert(bursaries).values({
      id,
      tenantId,
      title: input.title,
      funder: input.funder,
      fieldId: input.fieldId,
      amount: input.amount,
      description: input.description,
      applyUrl: input.applyUrl ?? null,
      deadline: new Date(input.deadline),
      status: input.status ?? 'DRAFT',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    });

    const [created] = await db.select().from(bursaries).where(eq(bursaries.id, id)).limit(1);
    return created;
  }),

  getBursary: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const [row] = await db
      .select()
      .from(bursaries)
      .where(and(eq(bursaries.id, input.id), notDeleted(bursaries)))
      .limit(1);

    if (!row || row.tenantId !== tenantId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Bursary not found' });
    }

    return row;
  }),

  updateBursary: privilegedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        funder: z.string().optional(),
        fieldId: z.string().optional(),
        amount: z.string().optional(),
        description: z.string().optional(),
        applyUrl: z.string().nullable().optional(),
        deadline: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;

      const [existing] = await db
        .select()
        .from(bursaries)
        .where(and(eq(bursaries.id, input.id), notDeleted(bursaries)))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bursary not found' });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.funder !== undefined) updates.funder = input.funder;
      if (input.fieldId !== undefined) updates.fieldId = input.fieldId;
      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.description !== undefined) updates.description = input.description;
      if (input.applyUrl !== undefined) updates.applyUrl = input.applyUrl;
      if (input.deadline !== undefined) updates.deadline = new Date(input.deadline);
      if (input.status !== undefined) updates.status = input.status;

      await db.update(bursaries).set(updates).where(eq(bursaries.id, input.id));

      const [updated] = await db
        .select()
        .from(bursaries)
        .where(eq(bursaries.id, input.id))
        .limit(1);
      return updated;
    }),

  deleteBursary: privilegedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;

      const [existing] = await db
        .select()
        .from(bursaries)
        .where(and(eq(bursaries.id, input.id), notDeleted(bursaries)))
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bursary not found' });
      }

      await db.update(bursaries).set({ deletedAt: new Date() }).where(eq(bursaries.id, input.id));
      return { deleted: true };
    }),

  listBursaryFields: publicProcedure.query(async ({ ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const rows = await db
      .select()
      .from(bursaryFields)
      .where(and(eq(bursaryFields.tenantId, tenantId), notDeleted(bursaryFields)))
      .orderBy(bursaryFields.label);

    return rows;
  }),

  listEducationResources: publicProcedure.query(async ({ ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const rows = await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.tenantId, tenantId),
          eq(resources.category, 'EDUCATION'),
          notDeleted(resources)
        )
      )
      .orderBy(desc(resources.createdAt));

    return rows;
  }),

  createEducationResource: privilegedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        provider: z.string().nullable().optional(),
        externalUrl: z.string().nullable().optional(),
        tags: z.array(z.string()).default([]),
        mediaType: z.enum(['BOOK', 'COURSE', 'JOURNAL', 'VIDEO']).nullable().optional(),
        featured: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;

      const id = createId();
      const ts = new Date();
      await db.insert(resources).values({
        id,
        tenantId,
        title: input.title,
        description: input.description ?? null,
        category: 'EDUCATION',
        externalUrl: input.externalUrl ?? null,
        provider: input.provider ?? null,
        tags: input.tags ?? [],
        mediaType: (input.mediaType as 'BOOK' | 'COURSE' | 'JOURNAL' | 'VIDEO' | null) ?? null,
        featured: input.featured ?? false,
        visibility: 'ALL_RESIDENTS',
        downloadCount: 0,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      });

      const [created] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
      return created;
    }),

  getEducationResource: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = tenantIdOrThrow(ctx.tenantId);

      const [row] = await db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.id, input.id),
            eq(resources.category, 'EDUCATION'),
            notDeleted(resources)
          )
        )
        .limit(1);

      if (!row || row.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      return row;
    }),

  updateEducationResource: privilegedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        provider: z.string().nullable().optional(),
        externalUrl: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        mediaType: z.enum(['BOOK', 'COURSE', 'JOURNAL', 'VIDEO']).nullable().optional(),
        featured: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;

      const [existing] = await db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.id, input.id),
            eq(resources.category, 'EDUCATION'),
            notDeleted(resources)
          )
        )
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.externalUrl !== undefined) updates.externalUrl = input.externalUrl;
      if (input.provider !== undefined) updates.provider = input.provider;
      if (input.tags !== undefined) updates.tags = input.tags;
      if (input.mediaType !== undefined) updates.mediaType = input.mediaType;
      if (input.featured !== undefined) updates.featured = input.featured;

      await db.update(resources).set(updates).where(eq(resources.id, input.id));

      const [updated] = await db
        .select()
        .from(resources)
        .where(eq(resources.id, input.id))
        .limit(1);
      return updated;
    }),

  deleteEducationResource: privilegedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;

      const [existing] = await db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.id, input.id),
            eq(resources.category, 'EDUCATION'),
            notDeleted(resources)
          )
        )
        .limit(1);

      if (!existing || existing.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      await db.update(resources).set({ deletedAt: new Date() }).where(eq(resources.id, input.id));
      return { deleted: true };
    }),

  getEducationSettings: publicProcedure.query(async ({ ctx }) => {
    const tenantId = tenantIdOrThrow(ctx.tenantId);

    const defaults = {
      pin: { title: '', sub: '', link: '', btn: 'Apply' },
      shelf: [] as Array<{ title: string; author: string; gutId: string; stripe: string }>,
    };

    const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
    const existing = rows.find(s => s.key === 'education_settings');

    if (existing?.value) {
      try {
        return { ...defaults, ...JSON.parse(existing.value) };
      } catch {
        return defaults;
      }
    }
    return defaults;
  }),

  updateEducationSettings: privilegedProcedure
    .input(
      z.object({
        pin: z
          .object({
            title: z.string(),
            sub: z.string(),
            link: z.string(),
            btn: z.string(),
          })
          .optional(),
        shelf: z
          .array(
            z.object({
              title: z.string(),
              author: z.string(),
              gutId: z.string(),
              stripe: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId!;
      const defaults = {
        pin: { title: '', sub: '', link: '', btn: 'Apply' },
        shelf: [] as Array<{ title: string; author: string; gutId: string; stripe: string }>,
      };

      const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
      const existing = rows.find(s => s.key === 'education_settings');

      const ts = now();
      const value = JSON.stringify({
        pin: input.pin ?? defaults.pin,
        shelf: input.shelf ?? defaults.shelf,
      });

      if (existing) {
        await db.update(settings).set({ value, updatedAt: ts }).where(eq(settings.id, existing.id));
      } else {
        await db.insert(settings).values({
          id: createId(),
          tenantId,
          key: 'education_settings',
          value,
          schemaVersion: 1,
          createdAt: ts,
          updatedAt: ts,
        });
      }

      return { pin: input.pin ?? defaults.pin, shelf: input.shelf ?? defaults.shelf };
    }),
});
