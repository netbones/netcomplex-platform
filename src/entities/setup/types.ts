/**
 * Setup entity — domain types for the persistent Setup Center.
 *
 * Replaces the ad-hoc 7-step onboarding wizard with a mission-based
 * operational workspace that tracks setup as a continuous lifecycle.
 */

/** The four permanent sections of the Setup Center. */
export type SetupSection = 'launch' | 'populate' | 'configure' | 'grow';

/**
 * Reference key for a specific mission, used by the recommendation engine
 * to look up mission definitions from DEFAULT_MISSIONS.
 */
export type MissionRef = string;

/** Per-tenant setup progress tracker. One row per tenant. */
export interface TenantSetup {
  id: string;
  tenantId: string;
  /** 0–100 progress percentage across all sections. */
  completionPercent: number;
  /** Completed section keys (e.g. ['launch']). */
  completedSections: SetupSection[];
  /** When the tenant first launched / went live. */
  launchedAt: string | null;
  /** When the tenant last viewed the Setup Center. */
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A single setup mission (task) belonging to one section. */
export interface SetupMission {
  id: string;
  tenantSetupId: string;
  /** Which SetupSection this mission belongs to. */
  section: SetupSection;
  /** Stable key used to look up the mission definition. */
  missionKey: MissionRef;
  /** Display title for this mission instance. */
  title: string;
  /** Optional longer description. */
  description: string | null;
  /** Whether this mission blocks launch. */
  isRequired: boolean;
  /** Whether the tenant has completed this mission. */
  isCompleted: boolean;
  /** Timestamp when the mission was completed. */
  completedAt: string | null;
  /** Display order within the section. */
  sortOrder: number;
  /** Arbitrary metadata (e.g. recommended module keys, help URLs). */
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A structured setting value scoped to one tenant setup. */
export interface SetupSetting {
  id: string;
  tenantSetupId: string;
  /** Setting key (e.g. 'launch.branding.colors'). */
  key: string;
  /** Arbitrary JSON value. */
  value: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
