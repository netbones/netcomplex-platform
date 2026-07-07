import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LaunchSection from '../ui/sections/LaunchSection';

// ── Mocks ──────────────────────────────────────────────────────────

// Prevent i18next from initializing on import
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
      t: (key: string, fallback?: string) => fallback ?? key,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('i18next-http-backend', () => ({ default: {} }));
vi.mock('i18next-browser-languagedetector', () => ({ default: {} }));

const mockSaveSetting = vi.fn();

vi.mock('../model/useAutoSaveSetting', () => ({
  useAutoSaveSetting: () => ({
    saveSetting: mockSaveSetting,
    isSaving: false,
    lastSaved: null,
    error: null,
    clearError: vi.fn(),
  }),
}));

// ── Tests ───────────────────────────────────────────────────────────

describe('LaunchSection', () => {
  beforeEach(() => {
    mockSaveSetting.mockClear();
  });

  it('renders all 6 required mission cards', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    expect(screen.getByText('Community Name')).toBeDefined();
    expect(screen.getByText('Brand Your Community')).toBeDefined();
    expect(screen.getByText('Contact Details')).toBeDefined();
    expect(screen.getByText('Connect a Domain')).toBeDefined();
    expect(screen.getByText('Set Your Timezone')).toBeDefined();
    expect(screen.getByText('Add Your Address')).toBeDefined();
  });

  it('shows required badges on all missions', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    const badges = screen.getAllByText('Required');
    expect(badges.length).toBe(6);
  });

  it('renders community name input field', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    const inputs = screen.getAllByRole('textbox');
    // Should have at least: name, email, phone, primary color (text), accent color (text)
    // domain, address line1, city, province, postalCode — that's 9+
    expect(inputs.length).toBeGreaterThanOrEqual(9);
  });

  it('triggers saveSetting on blur of community name field', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    // Find the community name input by its placeholder
    const nameInput = screen.getByPlaceholderText('e.g. Soralia Village');
    fireEvent.change(nameInput, { target: { value: 'Test Community' } });
    fireEvent.blur(nameInput);

    expect(mockSaveSetting).toHaveBeenCalledWith('launch.name', 'Test Community');
  });

  it('renders timezone dropdown', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    const selects = screen.getAllByRole('combobox');
    // Should have timezone select and font select
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders address inline fields', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    expect(screen.getByPlaceholderText('123 Village Road')).toBeDefined();
    expect(screen.getByPlaceholderText('Johannesburg')).toBeDefined();
    expect(screen.getByPlaceholderText('Gauteng')).toBeDefined();
    expect(screen.getByPlaceholderText('2000')).toBeDefined();
  });

  it('has branding section with color pickers', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    // Color inputs are type="color" — small count but present
    const colorInputs = document.querySelectorAll('input[type="color"]');
    expect(colorInputs.length).toBe(2); // primary + accent
  });

  it('trigger saveSetting on domain field blur', () => {
    render(<LaunchSection tenantId="tenant-1" />);

    const domainInput = screen.getByPlaceholderText('soralia.netbones.co.za');
    fireEvent.change(domainInput, { target: { value: 'my-domain.example.com' } });
    fireEvent.blur(domainInput);

    expect(mockSaveSetting).toHaveBeenCalledWith('launch.domain', 'my-domain.example.com');
  });
});
