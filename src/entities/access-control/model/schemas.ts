import { z } from 'zod';

const visitorTypeValues = ['WALK_IN', 'VEHICLE'] as const;
const visitTypeValues = ['SINGLE', 'RECURRING'] as const;
const eventStateValues = ['GRANTED', 'DENIED', 'PENDING'] as const;
const eventMethodValues = ['QR', 'CODE', 'MANUAL', 'ANPR', 'INTERCOM', 'AUTO_LIST'] as const;

export const createVisitorSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Name is required').max(120),
    phone: z.string().trim().max(32).optional().nullable(),
    visitorType: z.enum(visitorTypeValues),
    vehicleReg: z.string().trim().max(32).optional().nullable(),
    roleLabel: z.string().trim().max(80).optional().nullable(),
    visitType: z.enum(visitTypeValues).default('SINGLE'),
    validFrom: z.string().datetime({ offset: true }).or(z.string().min(1)),
    validUntil: z.string().datetime({ offset: true }).or(z.string().min(1)).optional().nullable(),
    recurrenceRule: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.visitorType === 'VEHICLE') {
      if (!data.vehicleReg?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vehicle registration is required',
          path: ['vehicleReg'],
        });
      }
      if (!data.phone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone is required for vehicle visitors',
          path: ['phone'],
        });
      }
    }
    if (data.visitType === 'RECURRING' && !data.recurrenceRule?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence rule is required for recurring visits',
        path: ['recurrenceRule'],
      });
    }
  });

export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;

export const quickAccessCodeSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().trim().max(32).optional().nullable(),
});

export type QuickAccessCodeInput = z.infer<typeof quickAccessCodeSchema>;

export const accessRequestActionSchema = z.enum(['allow', 'deny']);

export const manualAccessEventSchema = z.object({
  visitorLabel: z.string().trim().min(1).max(160),
  propertyId: z.string().uuid().optional().nullable(),
  vehicleReg: z.string().trim().max(32).optional().nullable(),
  state: z.enum(eventStateValues),
  gateId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ManualAccessEventInput = z.infer<typeof manualAccessEventSchema>;

export const accessEventsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  state: z.enum([...eventStateValues, 'ANY'] as const).optional(),
  method: z.enum([...eventMethodValues, 'ANY'] as const).optional(),
  range: z.enum(['today', '7d', '30d']).optional(),
});
