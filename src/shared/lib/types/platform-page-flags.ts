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
  headerEngagementFocus: 'conservation' | 'campaign';
}
