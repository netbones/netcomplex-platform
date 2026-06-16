import type { FilterType } from './types';

export const FILTER_TYPES: FilterType[] = [
  'All Residents',
  'Board Members',
  'Committee Members',
  'Renters',
  'Owners',
];

export const FILTER_TYPE_TO_API_PARAMS: Record<FilterType, Record<string, string>> = {
  'All Residents': {},
  'Board Members': { role: 'BOARD' },
  'Committee Members': { role: 'COMMITTEE' },
  Owners: { residencyType: 'OWNER' },
  Renters: { residencyType: 'RENTER' },
};

export const DEFAULT_PAGE_LIMIT = 12;

export const DEBOUNCE_DELAY_MS = 300;
