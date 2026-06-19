export const HEADER_LINK_IDS = [
  'directory',
  'groups',
  'services',
  'resources',
  'news',
  'surveys',
  'competitions',
  'conservation',
  'campaign',
] as const;

export type HeaderLinkId = (typeof HEADER_LINK_IDS)[number];

export interface PlatformPageFlags {
  campaign: boolean;
  conservation: 'default' | 'managed' | 'external';
  conservationExternalUrl: string;
  chat: boolean;
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
  bookings: boolean;
  messages: boolean;
  headerLinks: HeaderLinkId[];
}
