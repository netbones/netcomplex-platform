import type { AnnouncementPriority } from './priority-taxonomy';

/** Full announcement record as stored in the database */
export interface AnnouncementItem {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  author: string;
  priority: AnnouncementPriority;
  targetFilter: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  targetRoles: string[];
  resourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

/** Form data for creating/editing an announcement */
export interface AnnouncementFormData {
  title: string;
  content: string;
  author: string;
  priority: AnnouncementPriority;
  targetFilter?: 'ALL' | 'OWNERS_ONLY' | 'RENTERS_ONLY';
  targetRoles?: string[];
  resourceId?: string;
  expiresAt?: string;
}

/** Announcement with optional linked resource data */
export interface AnnouncementWithResource extends AnnouncementItem {
  resource?: {
    id: string;
    title: string;
    fileUrl: string | null;
    externalUrl: string | null;
  };
}
