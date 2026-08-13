import { z } from 'zod';
import { AMENITY_ICON_VALUES } from './icons';

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export const amenityAdminSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    icon: z.enum(AMENITY_ICON_VALUES),
    photoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    alwaysOpen: z.boolean(),
    hoursOpen: z.string().nullable().optional(),
    hoursClose: z.string().nullable().optional(),
    bookable: z.boolean(),
    slotDurationMins: z.number().int().positive().nullable().optional(),
    maxOccupancy: z.number().int().positive().nullable().optional(),
    waitlistEnabled: z.boolean(),
    rulesText: z.string().max(4000).nullable().optional(),
    active: z.boolean(),
    contactEnabled: z.boolean().optional(),
    contactPhone: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.alwaysOpen) {
      return;
    }
    if (!data.hoursOpen || !data.hoursClose) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Opens and Closes are required unless Always open is checked',
        path: ['hoursOpen'],
      });
      return;
    }
    if (!timeRe.test(data.hoursOpen) || !timeRe.test(data.hoursClose)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hours must be HH:MM',
        path: ['hoursOpen'],
      });
      return;
    }
    if (data.hoursClose <= data.hoursOpen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closes must be after Opens',
        path: ['hoursClose'],
      });
    }
  })
  .superRefine((data, ctx) => {
    if (!data.bookable) return;
    if (data.slotDurationMins == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Slot duration is required when bookable',
        path: ['slotDurationMins'],
      });
    }
    if (data.maxOccupancy == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max occupancy is required when bookable',
        path: ['maxOccupancy'],
      });
    }
  });

export type AmenityAdminInput = z.infer<typeof amenityAdminSchema>;

export const amenityReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

/** Normalize form payload to DB columns. */
export function toAmenityColumns(input: AmenityAdminInput) {
  const alwaysOpen = input.alwaysOpen;
  const bookable = input.bookable;
  const photoUrl = input.photoUrl === '' || input.photoUrl == null ? null : input.photoUrl;

  return {
    name: input.name.trim(),
    icon: input.icon,
    photoUrl,
    hoursOpen: alwaysOpen ? null : (input.hoursOpen ?? null),
    hoursClose: alwaysOpen ? null : (input.hoursClose ?? null),
    bookable,
    slotDurationMins: bookable ? (input.slotDurationMins ?? null) : null,
    maxOccupancy: bookable ? (input.maxOccupancy ?? null) : null,
    waitlistEnabled: bookable ? input.waitlistEnabled : false,
    rulesText: input.rulesText?.trim() ? input.rulesText.trim() : null,
    active: input.active,
    contactEnabled: input.contactEnabled ?? true,
    contactPhone: input.contactPhone?.trim() ? input.contactPhone.trim() : null,
    description: input.description?.trim() ? input.description.trim() : null,
  };
}
