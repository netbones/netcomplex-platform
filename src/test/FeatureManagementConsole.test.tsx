import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureManagementConsole } from '@/widgets/admin/ui/FeatureManagementConsole';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock hook and registry
vi.mock('@/shared/lib/hooks/usePageFlags', () => ({
  usePageFlags: () => ({
    flags: {
      directory: true,
      campaign: false,
    },
  }),
}));

global.fetch = vi.fn();

describe('FeatureManagementConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders features from registry', async () => {
    render(<FeatureManagementConsole />);
    expect(screen.getByText(/Feature Management Console/i)).toBeDefined();
    expect(screen.getByText(/Directory/i)).toBeDefined();
  });

  it('calls API when toggle is clicked', async () => {
    (global.fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });

    render(<FeatureManagementConsole />);

    const toggleButton = screen.getByText(/Visible/i);
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/settings/page-flags',
        expect.any(Object)
      );
    });
  });
});
