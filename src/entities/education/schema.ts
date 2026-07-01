import { z } from 'zod';

export const bursaryFieldSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  value: z.string().min(1, 'Value is required'),
  label: z.string().min(1, 'Label is required'),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  deletedAt: z.date().nullable().optional(),
});

export const bursaryStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const bursaryCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  funder: z.string().min(1, 'Funder is required'),
  fieldId: z.string().min(1, 'Field of study is required'),
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().min(1, 'Description is required'),
  applyUrl: z.string().url().nullable().optional(),
  deadline: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid deadline date',
  }),
  status: bursaryStatusEnum.default('DRAFT'),
});

export const bursaryUpdateSchema = bursaryCreateSchema.partial().extend({
  id: z.string(),
});

export const resourceMediaTypeEnum = z.enum(['BOOK', 'COURSE', 'JOURNAL', 'VIDEO']);

export const educationResourceCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
  mediaType: resourceMediaTypeEnum.nullable().optional(),
  featured: z.boolean().default(false),
});

export type BursaryFieldData = z.infer<typeof bursaryFieldSchema>;
export type BursaryCreateData = z.infer<typeof bursaryCreateSchema>;
export type BursaryUpdateData = z.infer<typeof bursaryUpdateSchema>;
export type EducationResourceCreateData = z.infer<typeof educationResourceCreateSchema>;
