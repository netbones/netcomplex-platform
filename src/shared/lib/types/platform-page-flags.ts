export const HEADER_LINK_IDS = [
  'campaign',
  'competitions',
  'conservation',
  'dashboard',
  'directory',
  'dWallet',
  'education',
  'groups',
  'news',
  'resources',
  'services',
  'surveys',
] as const;

export type HeaderLinkId = (typeof HEADER_LINK_IDS)[number];

export interface PlatformPageFlags {
  campaign: boolean;
  conservation: 'default' | 'managed' | 'external';
  conservationExternalUrl: string;
  conservationManagedUrl: string;
  chat: boolean;
  education: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
  groups: boolean;
  services: boolean;
  resources: boolean;
  maintenance: boolean;
  surveys: boolean;
  competitions: boolean;
  dashboard: boolean;
  disputes: boolean;
  dWallet: boolean;
  providers: boolean;
  bookings: boolean;
  marketplacePaypal: boolean;
  messages: boolean;
  headerLinks: HeaderLinkId[];
}
