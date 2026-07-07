/**
 * Setup entity — Zod validators for API request validation.
 */

import { z } from 'zod';

// ── SetupMission ──────────────────────────────────────────────────

export const setupMissionSchema = z.object({
  section: z.enum(['launch', 'populate', 'configure', 'grow']),
  missionKey: z
    .string()
    .min(1, 'Mission key is required')
    .regex(/^[a-z]+\.[a-z-]+$/, 'Invalid mission key format'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  isRequired: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  completedAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type SetupMissionInput = z.infer<typeof setupMissionSchema>;

// ── SetupSetting ──────────────────────────────────────────────────

export const setupSettingSchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
  value: z.unknown(),
});

export type SetupSettingInput = z.infer<typeof setupSettingSchema>;

// ── SetupProgress (for completion updates) ────────────────────────

export const setupProgressSchema = z.object({
  completionPercent: z.number().int().min(0).max(100).optional(),
  completedSections: z
    .array(z.enum(['launch', 'populate', 'configure', 'grow']))
    .optional(),
  launchedAt: z.string().datetime().nullable().optional(),
  lastViewedAt: z.string().datetime().nullable().optional(),
});

export type SetupProgressInput = z.infer<typeof setupProgressSchema>;
