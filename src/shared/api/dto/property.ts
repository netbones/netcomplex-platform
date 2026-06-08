import type { InferSelectModel } from 'drizzle-orm';
import { properties } from '@api/db';

/** @property-consolidation-plan (44-03 findings)
 * Canonical API shape (full). Per C1 resolution: STAYS as-is.
 * Dates serialized as ISO strings (for portable API contracts).
 * Fields: id, street, unit, platformAddress, homeImage?, ownerId?,
 *         createdAt (ISO), updatedAt (ISO) — all match Prisma field names.
 * Last audit: 2026-06-08
 */
// API-safe property shape
export interface PropertyDTO {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
  homeImage: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** @property-consolidation-plan (44-03 findings)
 * Canonical API shape (lite). Per C1 resolution: STAYS as-is.
 * Fields: id, street, unit, platformAddress, homeImage? — all match Prisma.
 * Last audit: 2026-06-08
 */
// Lightweight property summary for listings
export interface PropertySummaryDTO {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
  homeImage: string | null;
}

// Maps a Drizzle property row to PropertyDTO
export function toPropertyDTO(property: InferSelectModel<typeof properties>): PropertyDTO {
  return {
    id: property.id,
    street: property.street,
    unit: property.unit,
    platformAddress: property.platformAddress,
    homeImage: property.homeImage || null,
    ownerId: property.ownerId || null,
    createdAt: property.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: property.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle property rows to PropertyDTO[]
export function toPropertyDTOs(propertyRows: InferSelectModel<typeof properties>[]): PropertyDTO[] {
  return propertyRows.map(toPropertyDTO);
}

// Maps a Drizzle property row to PropertySummaryDTO
export function toPropertySummaryDTO(
  property: InferSelectModel<typeof properties>
): PropertySummaryDTO {
  return {
    id: property.id,
    street: property.street,
    unit: property.unit,
    platformAddress: property.platformAddress,
    homeImage: property.homeImage || null,
  };
}
