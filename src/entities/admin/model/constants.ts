export const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Raleway', label: 'Raleway' },
] as const;

export const DEFAULT_TENANT_COLORS = {
  primary: '#4F46E5',
  accent: '#F59E0B',
  secondary: '#10B981',
} as const;

export const TIER_ORDER = ['core', 'foundation', 'pro-max'] as const;
export type TierSlug = (typeof TIER_ORDER)[number];
