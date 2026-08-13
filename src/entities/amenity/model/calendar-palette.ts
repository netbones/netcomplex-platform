/** Fixed amenity calendar palette — indexed by sort_order among bookable amenities. */
export const AMENITY_CALENDAR_PALETTE = [
  {
    key: 'success',
    bg: 'bg-green-500',
    text: 'text-green-700',
    hex: '#22c55e',
    bar: 'bg-green-500',
  },
  {
    key: 'warning',
    bg: 'bg-amber-500',
    text: 'text-amber-700',
    hex: '#f59e0b',
    bar: 'bg-amber-500',
  },
  { key: 'danger', bg: 'bg-red-500', text: 'text-red-700', hex: '#ef4444', bar: 'bg-red-500' },
  { key: 'info', bg: 'bg-sky-500', text: 'text-sky-700', hex: '#0ea5e9', bar: 'bg-sky-500' },
  {
    key: 'violet',
    bg: 'bg-violet-500',
    text: 'text-violet-700',
    hex: '#8b5cf6',
    bar: 'bg-violet-500',
  },
  { key: 'pink', bg: 'bg-pink-500', text: 'text-pink-700', hex: '#ec4899', bar: 'bg-pink-500' },
  { key: 'teal', bg: 'bg-teal-500', text: 'text-teal-700', hex: '#14b8a6', bar: 'bg-teal-500' },
  {
    key: 'indigo',
    bg: 'bg-indigo-500',
    text: 'text-indigo-700',
    hex: '#6366f1',
    bar: 'bg-indigo-500',
  },
] as const;

export type AmenityCalendarColor = (typeof AMENITY_CALENDAR_PALETTE)[number];

/** Max colored dots shown in a month-grid day cell. */
export const CALENDAR_DOT_CAP = 3;

/**
 * Assign palette colors by ascending sort_order among the given bookable amenities.
 * Stable for a given order; reordering remaps colors (acceptable per spec).
 */
export function assignCalendarColors<T extends { id: string; sortOrder: number }>(
  amenities: T[]
): Array<T & { calendarColor: AmenityCalendarColor; colorIndex: number }> {
  const sorted = [...amenities].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  );
  return sorted.map((amenity, index) => ({
    ...amenity,
    colorIndex: index % AMENITY_CALENDAR_PALETTE.length,
    calendarColor: AMENITY_CALENDAR_PALETTE[index % AMENITY_CALENDAR_PALETTE.length],
  }));
}

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}
