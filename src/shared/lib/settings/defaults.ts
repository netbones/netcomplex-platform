import { type HeaderLinkId, type PlatformPageFlags } from '../types/platform-page-flags';

export const DEFAULT_PAGE_FLAGS: PlatformPageFlags = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: true,
  dashboard: true,
  dWallet: false,
  providers: true,
  bookings: true,
  messages: true,
  headerLinks: ['directory', 'groups', 'services', 'resources'] as HeaderLinkId[],
};
