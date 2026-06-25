import { z } from 'zod';

// Consent toggle — POST /consents/:streamKey body
export const consentSchema = z.object({
  granted: z.boolean(),
});
export type ConsentInput = z.infer<typeof consentSchema>;

// Payout request — POST /payout body
export const payoutRequestSchema = z.object({
  amount: z.number().positive().min(50, 'Minimum payout is R50'),
});
export type PayoutRequestInput = z.infer<typeof payoutRequestSchema>;

// Export request — POST /export body
export const exportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});
export type ExportRequestInput = z.infer<typeof exportRequestSchema>;

// Distribution batch — POST /admin/dwallet/batches body
export const batchSchema = z.object({
  streamKey: z.string().min(1, 'Stream key is required'),
  periodStart: z.string().datetime({ message: 'Invalid period start date' }),
  periodEnd: z.string().datetime({ message: 'Invalid period end date' }),
  totalRevenue: z.number().positive('Total revenue must be positive'),
});
export type BatchInput = z.infer<typeof batchSchema>;

// Payout status update — PATCH /admin/dwallet/payouts/:id body
export const payoutStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'REJECTED']),
  notes: z.string().optional(),
});
export type PayoutStatusInput = z.infer<typeof payoutStatusSchema>;

// Revenue stream config — POST /admin/dwallet/streams body
export const streamConfigSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().optional(),
  residentSharePct: z.number().min(0).max(100),
  isActive: z.boolean().default(true),
});
export type StreamConfigInput = z.infer<typeof streamConfigSchema>;

// Revenue stream update — PATCH /admin/dwallet/streams/:id body
export const streamUpdateSchema = streamConfigSchema.partial();
export type StreamUpdateInput = z.infer<typeof streamUpdateSchema>;
