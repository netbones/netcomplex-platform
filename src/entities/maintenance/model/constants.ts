/**
 * Preset catalog of all possible maintenance category options.
 * Used by the onboarding wizard and admin settings to let tenants pick their categories.
 * Tenants select from these presets and can add custom categories.
 */
export const PRESET_CATEGORIES: TenantCategory[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC/Climate' },
  { value: 'structural', label: 'Structural' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'common_area', label: 'Common Area' },
  { value: 'security', label: 'Security' },
  { value: 'water_emergency', label: 'Water Emergency' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'elevator', label: 'Elevator/Lift' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'noise', label: 'Noise Complaint' },
  { value: 'parking', label: 'Parking Issue' },
  { value: 'other', label: 'Other' },
];

/**
 * Default categories for backward compatibility — the 8 original ones.
 * Used when a tenant has no custom category configuration.
 */
export const DEFAULT_CATEGORIES: TenantCategory[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC/Climate' },
  { value: 'structural', label: 'Structural' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'common_area', label: 'Common Area' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

/**
 * A tenant-configurable maintenance category with value/label pairs.
 */
export interface TenantCategory {
  value: string;
  label: string;
}
