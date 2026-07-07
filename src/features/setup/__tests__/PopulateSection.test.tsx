import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PopulateSection from '../ui/sections/PopulateSection';

// ── Mocks ──────────────────────────────────────────────────────────

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

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ─────────────────────────────────────────────────────────

function createMockResponse(status: number, body: Record<string, unknown> = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('PopulateSection', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(createMockResponse(201, { id: 'inv-1' }));
  });

  it('renders all 5 optional mission cards', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    expect(screen.getByText('Invite Board Members')).toBeDefined();
    expect(screen.getByText('Invite Residents')).toBeDefined();
    expect(screen.getByText('Import Members')).toBeDefined();
    expect(screen.getByText('Assign Roles')).toBeDefined();
    expect(screen.getByText('Create Service Accounts')).toBeDefined();
  });

  it('renders board member email input with Add button', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const emailInput = screen.getByPlaceholderText('board@example.com');
    expect(emailInput).toBeDefined();

    const addButton = screen.getAllByText('Add')[0];
    expect(addButton).toBeDefined();
  });

  it('adds a board member invite to the pending list', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const emailInput = screen.getByPlaceholderText('board@example.com');
    fireEvent.change(emailInput, { target: { value: 'board@soralia.co.za' } });

    const addButton = screen.getAllByText('Add')[0];
    fireEvent.click(addButton);

    expect(screen.getByText('board@soralia.co.za')).toBeDefined();
  });

  it('renders resident batch email textarea', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const textarea = screen.getByPlaceholderText(/resident1@example.com/);
    expect(textarea).toBeDefined();

    const sendButton = screen.getByText('Send Resident Invitations');
    expect(sendButton).toBeDefined();
  });

  it('sends resident invitations when Send is clicked', async () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const textarea = screen.getByPlaceholderText(/resident1@example.com/);
    fireEvent.change(textarea, { target: { value: 'a@test.com\nb@test.com' } });

    const sendButton = screen.getByText('Send Resident Invitations');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('renders CSV upload file input', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeDefined();
    expect(fileInput?.getAttribute('accept')).toBe('.csv');
  });

  it('parses valid CSV content and shows preview table', async () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const csvContent = 'name,email,role\nAlice,alice@test.com,RESIDENT\nBob,bob@test.com,BOARD';

    const file = new File([csvContent], 'members.csv', { type: 'text/csv' });

    // Simulate file upload via fireEvent
    fireEvent.change(fileInput, { target: { files: [file] } });

    // FileReader is async — wait for preview to render
    await waitFor(() => {
      expect(screen.getByText('alice@test.com')).toBeDefined();
    });

    expect(screen.getByText('bob@test.com')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('RESIDENT')).toBeDefined();
    expect(screen.getByText('BOARD')).toBeDefined();
  });

  it('shows CSV error for file without email column', async () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const csvContent = 'name,role\nAlice,RESIDENT'; // no email column

    const file = new File([csvContent], 'bad.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/must contain an "email" column/i)).toBeDefined();
    });
  });

  it('renders service account form with name, email, role', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    expect(screen.getByPlaceholderText('Full name')).toBeDefined();
    expect(screen.getByPlaceholderText('provider@example.com')).toBeDefined();
    expect(screen.getByText('Send Invitation')).toBeDefined();
  });

  it('has a link to user management in Assign Roles', () => {
    render(<PopulateSection tenantId="tenant-1" />);

    const link = screen.getByText('User Management');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/admin/users');
  });
});
