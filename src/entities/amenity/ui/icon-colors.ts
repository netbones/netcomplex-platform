// Tabler icon name → color mapping, shared by the amenity catalogue card
// and the My Bookings rows. Colors are per-amenity-type (not per-status);
// status is carried separately by the badge.
export const AMENITY_ICON_COLORS: Record<string, { bg: string; text: string }> = {
  tennis: { bg: 'bg-green-100', text: 'text-green-600' },
  swimming: { bg: 'bg-amber-100', text: 'text-amber-600' },
  parking: { bg: 'bg-gray-100', text: 'text-gray-600' },
  fire: { bg: 'bg-red-100', text: 'text-red-600' },
  gym: { bg: 'bg-purple-100', text: 'text-purple-600' },
  default: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};
