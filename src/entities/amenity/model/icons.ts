/** Tabler icon keys shared by resident catalogue and admin form. */
export const AMENITY_ICON_OPTIONS = [
  { value: 'tennis', label: 'Tennis' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'parking', label: 'Parking' },
  { value: 'fire', label: 'Fire' },
  { value: 'gym', label: 'Gym' },
] as const;

export type AmenityIconValue = (typeof AMENITY_ICON_OPTIONS)[number]['value'];

export const AMENITY_ICON_VALUES = AMENITY_ICON_OPTIONS.map(o => o.value) as [
  AmenityIconValue,
  ...AmenityIconValue[],
];
