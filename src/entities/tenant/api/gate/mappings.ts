/**
 * Feature Gate — mapping tables and types (zero server dependencies).
 *
 * Extracted from gate.ts so client-side consumers (e.g. @features/gate/model/gate.ts)
 * can import these without pulling the server-only deps chain (ioredis → dns).
 */

import type { PlatformPageFlags } from '@shared/lib';
import type { Role, TenantTier } from '@/shared/lib';

// ============================================
// TYPES
// ============================================

/** Canonical 15-key feature namespace. */
export type FeatureKey =
  | 'maintenance'
  | 'bookings'
  | 'events'
  | 'surveys'
  | 'competitions'
  | 'groups'
  | 'chat'
  | 'news'
  | 'dashboard'
  | 'dWallet'
  | 'directory'
  | 'resources'
  | 'conservation'
  | 'services'
  | 'messages';

export type GateReason = 'role' | 'tier' | 'module' | 'flag' | 'feature' | 'allowed';

export interface GateResult {
  allowed: boolean;
  reason: GateReason;
}

export interface GateContext {
  tenantId: string;
  role: Role;
  tier: TenantTier;
}

// ============================================
// MAPPING TABLES (canonical source of truth)
// ============================================

export const FEATURE_TO_MODULE: Record<FeatureKey, string | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  dashboard: null,
  dWallet: 'dWallet',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'marketplace',
  messages: 'chat',
  competitions: null,
};

type PlatformPageFlagKey = keyof PlatformPageFlags;

export const FEATURE_TO_FLAG: Record<FeatureKey, PlatformPageFlagKey | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  dashboard: 'dashboard',
  dWallet: 'dWallet',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'services',
  competitions: 'competitions',
  messages: 'messages',
};

export const FEATURE_TO_REGISTRY: Record<FeatureKey, string | null> = {
  maintenance: 'page.maintenance',
  bookings: 'page.bookings',
  surveys: 'page.surveys',
  events: 'page.events',
  groups: 'page.groups',
  chat: 'page.chat',
  news: 'page.news',
  dashboard: null,
  dWallet: 'page.dWallet',
  directory: 'page.directory',
  resources: 'page.resources',
  conservation: 'page.conservation',
  services: 'page.marketplace',
  messages: 'page.chat',
  competitions: null,
};

export const GATE_REASON_TO_ERROR: Record<GateReason, string> = {
  role: 'INSUFFICIENT_ROLE',
  tier: 'TIER_REQUIRED',
  module: 'MODULE_DISABLED',
  flag: 'PAGE_DISABLED',
  feature: 'FEATURE_UNAVAILABLE',
  allowed: 'OK',
};
