/**
 * Registry tests for dispute widget registrations.
 * Plan 107-03 Task 3
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the dynamic imports so lazy() doesn't fail in test
vi.mock('@entities/dispute', () => ({}));
vi.mock('@features/dispute', () => ({}));

import type { WidgetManifest } from '../types';
import { registerAllWidgets } from '../widgets';

describe('widgets-disputes registry', () => {
  function createMockRegistry() {
    const entries: WidgetManifest[] = [];
    return {
      entries,
      register: vi.fn((m: WidgetManifest) => {
        entries.push(m);
      }),
    };
  }

  it('my-disputes widget exists with correct config', () => {
    const registry = createMockRegistry();
    registerAllWidgets(registry);

    const myDisputes = registry.entries.find((e: WidgetManifest) => e.id === 'my-disputes');

    expect(myDisputes).toBeDefined();
    expect(myDisputes!.id).toBe('my-disputes');
    expect(myDisputes!.spaces).toEqual(['home', 'community']);
    expect(myDisputes!.featureFlag).toBe('disputes');
    expect(myDisputes!.icon).toBeDefined();
    // Scale icon name check (lucide-react icon component name)
    expect(myDisputes!.icon.displayName ?? '').toMatch(/Scale/i);
  });

  it('admin-disputes widget exists with correct config', () => {
    const registry = createMockRegistry();
    registerAllWidgets(registry);

    const adminDisputes = registry.entries.find((e: WidgetManifest) => e.id === 'admin-disputes');

    expect(adminDisputes).toBeDefined();
    expect(adminDisputes!.id).toBe('admin-disputes');
    expect(adminDisputes!.spaces).toEqual(['admin']);
    expect(adminDisputes!.permissions).toEqual(['admin', 'board']);
    expect(adminDisputes!.featureFlag).toBe('disputes');
    expect(adminDisputes!.icon).toBeDefined();
    // Gavel icon name check
    expect(adminDisputes!.icon.displayName ?? '').toMatch(/Gavel/i);
  });
});
