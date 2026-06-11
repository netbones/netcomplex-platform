import type { InferSelectModel } from 'drizzle-orm';
import { resources } from '../db';

// API-safe resource shape
export interface ResourceDTO {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  bodyContent: unknown;
  version: string | null;
  visibility: string;
  authorId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Maps a Drizzle resource row to ResourceDTO
export function toResourceDTO(resource: InferSelectModel<typeof resources>): ResourceDTO {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description || null,
    category: resource.category,
    fileUrl: resource.fileUrl || null,
    fileType: resource.fileType || null,
    fileSize: resource.fileSize ?? null,
    externalUrl: resource.externalUrl || null,
    bodyContent: resource.bodyContent || null,
    version: resource.version || null,
    visibility: resource.visibility,
    authorId: resource.authorId || null,
    publishedAt: resource.publishedAt?.toISOString() ?? null,
    createdAt: resource.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: resource.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle resource rows to ResourceDTO[]
export function toResourceDTOs(resourceRows: InferSelectModel<typeof resources>[]): ResourceDTO[] {
  return resourceRows.map(toResourceDTO);
}
