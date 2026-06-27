import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingBottomSheet } from '../ui/BookingBottomSheet';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
vi.mock('../ui/DatePicker', () => ({
  DatePicker: vi.fn(({ onSelect }: { onSelect: (date: string) => void }) => (
    <div data-testid="date-picker">
      <button type="button" onClick={() => onSelect('2026-07-15')}>
        Select July 15
      </button>
    </div>
  )),
}));

vi.mock('../ui/TimeSlotGrid', () => ({
  TimeSlotGrid: vi.fn(
    ({
      onSelect,
      onBack,
    }: {
      onSelect: (slot: { start: string; end: string }) => void;
      onBack: () => void;
    }) => (
      <div data-testid="time-slot-grid">
        <button type="button" onClick={() => onSelect({ start: '09:00', end: '09:30' })}>
          Pick 09:00
        </button>
        <button type="button" onClick={onBack}>
          Back to Date
        </button>
      </div>
    )
  ),
}));

vi.mock('../ui/CheckoutSummary', () => ({
  CheckoutSummary: vi.fn(({ onPay, onBack }: { onPay: () => void; onBack: () => void }) => (
    <div data-testid="checkout-summary">
      <button type="button" onClick={onPay}>
        Confirm & Pay
      </button>
      <button type="button" onClick={onBack}>
        Back to Time
      </button>
    </div>
  )),
}));

// ---------------------------------------------------------------------------
// Mock listing data
// ---------------------------------------------------------------------------
interface MockListing {
  id: string;
  title: string;
  description: string;
  category: string;
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE' | 'FREE';
  price: number;
  currency: string;
  images: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  provider: { id: string; name: string; email: string };
  availability: Record<string, { start: string; end: string }[]>;
}

const mockListing: MockListing = {
  id: 'listing-1',
  title: 'Test Service',
  description: '',
  category: 'plumbing',
  priceType: 'FIXED',
  price: 500,
  currency: 'ZAR',
  images: [],
  verified: false,
  rating: 4.5,
  reviewCount: 10,
  provider: { id: 'provider-1', name: 'Test Provider', email: 'p@test.com' },
  availability: {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
};

describe('BookingBottomSheet', () => {
  // -- Test 1: Renders DatePicker when isOpen and step='date' ---------------
  it('renders step 1 (DatePicker) on open', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    expect(screen.getByTestId('date-picker')).toBeDefined();
  });

  // -- Test 2: Selecting date advances to step 2 (TimeSlotGrid) --------------
  it('selecting a date advances to step 2 (TimeSlotGrid)', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Click mock date picker button
    fireEvent.click(screen.getByText('Select July 15'));

    expect(screen.getByTestId('time-slot-grid')).toBeDefined();
  });

  // -- Test 3: Selecting time slot advances to step 3 (CheckoutSummary) ------
  it('selecting a time slot advances to step 3 (CheckoutSummary)', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Step 1 → 2
    fireEvent.click(screen.getByText('Select July 15'));
    // Step 2 → 3
    fireEvent.click(screen.getByText('Pick 09:00'));

    expect(screen.getByTestId('checkout-summary')).toBeDefined();
  });

  // -- Test 4: Back button navigation works ---------------------------------
  it('back button in step 3 returns to step 2; back in step 2 returns to step 1', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Go to step 3
    fireEvent.click(screen.getByText('Select July 15')); // step 2
    fireEvent.click(screen.getByText('Pick 09:00')); // step 3
    expect(screen.getByTestId('checkout-summary')).toBeDefined();

    // Back to step 2
    fireEvent.click(screen.getByText('Back to Time'));
    expect(screen.getByTestId('time-slot-grid')).toBeDefined();

    // Back to step 1
    fireEvent.click(screen.getByText('Back to Date'));
    expect(screen.getByTestId('date-picker')).toBeDefined();
  });

  // -- Test 5: Safe-area-inset-bottom applied (D-16) ------------------------
  it('renders with pb-[env(safe-area-inset-bottom,16px)] on sheet container', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    const { container } = render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Check the inner content area has safe-area padding
    const allDivs = container.querySelectorAll('div');
    let foundSafeArea = false;
    allDivs.forEach(div => {
      if (div.className.includes('safe-area-inset-bottom') || div.className.includes('pb-[env')) {
        foundSafeArea = true;
      }
    });
    expect(foundSafeArea).toBe(true);
  });

  // -- Test 6: Bottom sheet is hidden when isOpen=false ---------------------
  it('is hidden when isOpen=false', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    const { container } = render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={false}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Should not render date picker
    expect(screen.queryByTestId('date-picker')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  // -- Test 7: Step indicator dots show correct active/completed states -----
  it('step indicator dots show correct states (3 dots)', () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    const { container } = render(
      <BookingBottomSheet
        listing={mockListing}
        isOpen={true}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    // Should have 3 step indicator dots
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });
});
