/**
 * Setup entity — constants for sections, mission catalog, and required checks.
 */

import type { SetupSection, MissionRef } from './types';

// ── Sections ──────────────────────────────────────────────────────

export interface SectionDef {
  key: SetupSection;
  labelKey: string;
  isRequired: boolean;
}

export const SECTIONS: SectionDef[] = [
  { key: 'launch', labelKey: 'setup.sections.launch', isRequired: true },
  { key: 'populate', labelKey: 'setup.sections.populate', isRequired: false },
  {
    key: 'configure',
    labelKey: 'setup.sections.configure',
    isRequired: false,
  },
  { key: 'grow', labelKey: 'setup.sections.grow', isRequired: false },
];

// ── Mission Catalog ───────────────────────────────────────────────

export interface MissionDef {
  missionKey: MissionRef;
  section: SetupSection;
  title: string;
  description: string;
  isRequired: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Master catalog of all available setup missions.
 * Plan 123-02 will seed these into SetupMission rows on tenant creation.
 */
export const DEFAULT_MISSIONS: Record<MissionRef, MissionDef> = {
  // ── LAUNCH (required) ───────────────────────────────────────
  'launch.identity': {
    missionKey: 'launch.identity',
    section: 'launch',
    title: 'Name your community',
    description: 'Set the tenant name, slug, and tagline.',
    isRequired: true,
    metadata: { fields: ['name', 'slug', 'tagline'] },
  },
  'launch.branding': {
    missionKey: 'launch.branding',
    section: 'launch',
    title: 'Choose your brand',
    description: 'Upload a logo, set primary colour, and pick fonts.',
    isRequired: true,
    metadata: {
      fields: ['logoUrl', 'primaryColor', 'fontFamily'],
    },
  },
  'launch.domain': {
    missionKey: 'launch.domain',
    section: 'launch',
    title: 'Connect a domain',
    description: 'Set your custom domain so residents can find you.',
    isRequired: true,
    metadata: { fields: ['customDomain'] },
  },
  'launch.timezone': {
    missionKey: 'launch.timezone',
    section: 'launch',
    title: 'Set your timezone',
    description: 'Choose the timezone for events and reminders.',
    isRequired: true,
    metadata: { fields: ['timezone'] },
  },
  'launch.address': {
    missionKey: 'launch.address',
    section: 'launch',
    title: 'Add your address',
    description: 'Set the physical address for maps and directions.',
    isRequired: true,
    metadata: { fields: ['address'] },
  },

  // ── POPULATE ─────────────────────────────────────────────────
  'populate.invite-board': {
    missionKey: 'populate.invite-board',
    section: 'populate',
    title: 'Invite board members',
    description: 'Send invitations to your board or committee.',
    isRequired: false,
    metadata: { role: 'BOARD' },
  },
  'populate.invite-residents': {
    missionKey: 'populate.invite-residents',
    section: 'populate',
    title: 'Invite residents',
    description: 'Invite the first residents to join the platform.',
    isRequired: false,
    metadata: { role: 'RESIDENT' },
  },
  'populate.import': {
    missionKey: 'populate.import',
    section: 'populate',
    title: 'Import households',
    description: 'Bulk-import properties and residents from a CSV.',
    isRequired: false,
    metadata: { accepts: ['.csv'] },
  },
  'populate.service-accounts': {
    missionKey: 'populate.service-accounts',
    section: 'populate',
    title: 'Create service accounts',
    description: 'Set up accounts for vendors, agents, and staff.',
    isRequired: false,
    metadata: { roles: ['AGENT', 'PROVIDER', 'MANAGER'] },
  },

  // ── CONFIGURE ────────────────────────────────────────────────
  'configure.modules': {
    missionKey: 'configure.modules',
    section: 'configure',
    title: 'Enable platform modules',
    description: 'Choose which features are active for your community.',
    isRequired: false,
    metadata: { page: '/admin/modules' },
  },
  'configure.facilities': {
    missionKey: 'configure.facilities',
    section: 'configure',
    title: 'Add facilities',
    description: 'Set up bookable amenities (pool, clubhouse, etc.).',
    isRequired: false,
    metadata: { page: '/admin/facilities' },
  },
  'configure.maintenance': {
    missionKey: 'configure.maintenance',
    section: 'configure',
    title: 'Configure maintenance',
    description: 'Set up maintenance categories, teams, and providers.',
    isRequired: false,
    metadata: { page: '/admin/maintenance' },
  },
  'configure.bookings': {
    missionKey: 'configure.bookings',
    section: 'configure',
    title: 'Set up bookings',
    description: 'Configure booking rules, time slots, and pricing.',
    isRequired: false,
    metadata: { page: '/admin/bookings' },
  },
  'configure.wallet': {
    missionKey: 'configure.wallet',
    section: 'configure',
    title: 'Set up dWallet',
    description: 'Configure data-sharing revenue and community value.',
    isRequired: false,
    metadata: { page: '/admin/dwallet' },
  },

  // ── GROW ─────────────────────────────────────────────────────
  'grow.merits': {
    missionKey: 'grow.merits',
    section: 'grow',
    title: 'Enable Community Merits',
    description: 'Reward positive behaviour with recognition points.',
    isRequired: false,
    metadata: { module: 'merits' },
  },
  'grow.surveys': {
    missionKey: 'grow.surveys',
    section: 'grow',
    title: 'Run your first survey',
    description: 'Create a poll to engage residents.',
    isRequired: false,
    metadata: { page: '/admin/surveys' },
  },
  'grow.marketplace': {
    missionKey: 'grow.marketplace',
    section: 'grow',
    title: 'Open the marketplace',
    description: 'Let residents offer and find local services.',
    isRequired: false,
    metadata: { module: 'marketplace' },
  },
  'grow.disputes': {
    missionKey: 'grow.disputes',
    section: 'grow',
    title: 'Set up dispute resolution',
    description: 'Configure CSOS-compliant mediation workflows.',
    isRequired: false,
    metadata: { module: 'disputes' },
  },
};

// ── Required for Launch ───────────────────────────────────────────

/**
 * Missions that MUST be completed before `launchedAt` can be set.
 * Derived from DEFAULT_MISSIONS where `isRequired === true` and `section === 'launch'`.
 */
export const REQUIRED_LAUNCH_MISSIONS: MissionRef[] = Object.values(
  DEFAULT_MISSIONS,
)
  .filter((m) => m.section === 'launch' && m.isRequired)
  .map((m) => m.missionKey);
