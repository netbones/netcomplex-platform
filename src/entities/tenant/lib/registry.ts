/**
 * Custom Section Registry
 *
 * This module allows tenants to define custom content sections that can be
 * rendered dynamically on their pages. Tenants can add custom components
 * that will be available throughout the platform.
 *
 * Usage:
 * 1. Add custom components in src/components/custom/sections/
 * 2. Register them in the CUSTOM_SECTIONS object below
 * 3. Use CustomSectionRenderer to render by section ID
 */

import { ComponentType } from 'react';

// Import your custom section components here
// Example: import { CustomHeroSection } from './sections/CustomHeroSection';

/**
 * Custom section metadata
 */
export interface CustomSectionMeta {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'content' | 'call-to-action' | 'footer' | 'custom';
  defaultProps?: Record<string, unknown>;
}

/**
 * Custom section entry in registry
 */
export interface CustomSectionEntry {
  component: ComponentType<unknown>;
  metadata: CustomSectionMeta;
}

/**
 * Custom sections registry
 * Add your tenant-specific sections here
 */
export const CUSTOM_SECTIONS: Record<string, CustomSectionEntry> = {
  // Add custom sections like:
  // 'custom-hero': {
  //   component: CustomHeroSection,
  //   metadata: {
  //     id: 'custom-hero',
  //     name: 'Custom Hero',
  //     description: 'Custom hero section with tenant branding',
  //     category: 'hero',
  //   },
  // },
};

/**
 * Get all custom section metadata (for admin UI)
 */
export function getAllCustomSections(): CustomSectionMeta[] {
  return Object.values(CUSTOM_SECTIONS).map(entry => entry.metadata);
}

/**
 * Get custom section component by ID
 */
export function getCustomSection(sectionId: string): ComponentType<unknown> | undefined {
  return CUSTOM_SECTIONS[sectionId]?.component;
}

/**
 * Get custom section metadata by ID
 */
export function getCustomSectionMeta(sectionId: string): CustomSectionMeta | undefined {
  return CUSTOM_SECTIONS[sectionId]?.metadata;
}

/**
 * Check if a custom section exists
 */
export function hasCustomSection(sectionId: string): boolean {
  return sectionId in CUSTOM_SECTIONS;
}

/**
 * Get sections by category
 */
export function getCustomSectionsByCategory(category: string): CustomSectionMeta[] {
  return Object.values(CUSTOM_SECTIONS)
    .map(entry => entry.metadata)
    .filter(meta => meta.category === category);
}
