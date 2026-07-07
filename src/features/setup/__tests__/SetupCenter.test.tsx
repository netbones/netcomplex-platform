import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupCenter from '../ui/SetupCenter';
import SetupSection from '../ui/SetupSection';
import type { SetupData } from '../ui/SetupCenter';
import type { SetupMission } from '@/entities/setup';

// ── Mocks ──────────────────────────────────────────────────────────

// Prevent i18next from initializing on import (side-effect in @shared/lib/i18n)
vi.mock('i18next', () => ({
  default: {
    use: () => ({ use: () => ({ use: () => ({ init: () => Promise.resolve() }) }) }),
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : String(key)),
    language: 'en',
  },
}));

vi.mock('react-i18next', async importOriginal => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
        if (key.startsWith('setup.sections.')) return key.replace('setup.sections.', '');
        let text = fallback ?? key;
        // Simple interpolation for {{key}} patterns
        if (options) {
          text = text.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(options[k] ?? `{{${k}}}`));
        }
        return text;
      },
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('i18next-http-backend', () => ({ default: {} }));
vi.mock('i18next-browser-languagedetector', () => ({ default: {} }));

vi.mock('../model/useSetupProgress', () => ({
  useSetupProgress: () => ({
    setup: null,
    isLoading: false,
    error: null,
    refreshProgress: vi.fn(),
    updateMission: vi.fn(),
    updateSetting: vi.fn(),
    isUpdating: false,
  }),
}));

// ── Helpers ─────────────────────────────────────────────────────────

function makeMission(overrides: Partial<SetupMission> = {}): SetupMission {
  return {
    id: 'm1',
    tenantSetupId: 'ts1',
    section: 'launch',
    missionKey: 'launch.identity',
    title: 'Name your community',
    description: 'Set the tenant name and slug',
    isRequired: true,
    isCompleted: false,
    completedAt: null,
    sortOrder: 1,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

function makeSetupData(overrides: Partial<SetupData> = {}): SetupData {
  return {
    id: 'setup-1',
    tenantId: 'tenant-1',
    completionPercent: 25,
    completedSections: [],
    launchedAt: null,
    lastViewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    missions: {
      launch: [
        makeMission({ isCompleted: true }),
        makeMission({ id: 'm2', missionKey: 'launch.branding', title: 'Choose brand' }),
      ],
      populate: [],
      configure: [],
      grow: [],
    },
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('SetupCenter', () => {
  it('renders with initial data', () => {
    const data = makeSetupData();
    render(<SetupCenter tenantId="tenant-1" initialData={data} />);

    expect(screen.getByText('Community Setup')).toBeDefined();
    expect(screen.getByText('25% Complete')).toBeDefined();
  });

  it('shows empty state when no setup data exists', () => {
    render(<SetupCenter tenantId="tenant-1" initialData={null} />);

    expect(screen.getByText('Community Setup')).toBeDefined();
    expect(screen.getByText(/setup data is being prepared/i)).toBeDefined();
  });

  it('renders progress bar reflecting completionPercent', () => {
    const data = makeSetupData({ completionPercent: 72 });
    render(<SetupCenter tenantId="tenant-1" initialData={data} />);

    expect(screen.getByText('72% Complete')).toBeDefined();
    // Progress bar has width 72%
    const bar = document.querySelector('.bg-soralia-primary');
    expect(bar).not.toBeNull();
    expect((bar as HTMLElement).style.width).toBe('72%');
  });

  it('renders all 4 sections with correct titles', () => {
    const data = makeSetupData();
    render(<SetupCenter tenantId="tenant-1" initialData={data} />);

    expect(screen.getByText('launch')).toBeDefined();
    expect(screen.getByText('populate')).toBeDefined();
    expect(screen.getByText('configure')).toBeDefined();
    expect(screen.getByText('grow')).toBeDefined();
  });

  it('clamps progress at 0 min and 100 max', () => {
    const overData = makeSetupData({ completionPercent: 150 });
    render(<SetupCenter tenantId="tenant-1" initialData={overData} />);
    const bar = document.querySelector('.bg-soralia-primary');
    expect((bar as HTMLElement).style.width).toBe('100%');

    // Re-render with negative
    const underData = makeSetupData({ completionPercent: -10 });
    const { container } = render(<SetupCenter tenantId="tenant-1" initialData={underData} />);
    const bar2 = container.querySelector<HTMLElement>('.bg-soralia-primary');
    expect(bar2).not.toBeNull();
    expect(bar2!.style.width).toBe('0%');
  });

  it('exposes mutation function handles via test id', () => {
    const data = makeSetupData();
    render(<SetupCenter tenantId="tenant-1" initialData={data} />);

    const el = screen.getByTestId('setup-mutations');
    const parsed = JSON.parse(el.textContent || '{}');
    expect(parsed.hasUpdateMission).toBe(true);
    expect(parsed.hasUpdateSetting).toBe(true);
    expect(parsed.hasRefreshProgress).toBe(true);
  });
});

describe('SetupSection', () => {
  const missions = [
    makeMission({ isCompleted: true }),
    makeMission({ id: 'm2', missionKey: 'launch.branding', title: 'Choose brand' }),
  ];

  it('displays section title with completion badge', () => {
    render(
      <SetupSection
        section="launch"
        title="Launch"
        isRequired={true}
        missions={missions}
        completedCount={1}
        totalCount={2}
      />
    );

    expect(screen.getByText('Launch')).toBeDefined();
    expect(screen.getByText('1/2')).toBeDefined();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('shows missions when expanded', () => {
    render(
      <SetupSection
        section="launch"
        title="Launch"
        isRequired={true}
        missions={missions}
        completedCount={1}
        totalCount={2}
      />
    );

    // Click to expand
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Name your community')).toBeDefined();
    expect(screen.getByText('Choose brand')).toBeDefined();
  });

  it('shows empty state when no missions', () => {
    render(
      <SetupSection
        section="launch"
        title="Launch"
        isRequired={false}
        missions={[]}
        completedCount={0}
        totalCount={0}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText(/no missions/i)).toBeDefined();
  });

  it('shows all-complete badge when every mission is done', () => {
    render(
      <SetupSection
        section="launch"
        title="Launch"
        isRequired={false}
        missions={[makeMission({ isCompleted: true })]}
        completedCount={1}
        totalCount={1}
      />
    );

    expect(screen.getByText('1/1')).toBeDefined();
    // Green checkmark should be present
    const checkmark = document.querySelector('.text-green-500');
    expect(checkmark).not.toBeNull();
  });
});
