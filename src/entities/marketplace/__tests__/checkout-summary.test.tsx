import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutSummary } from '../ui/CheckoutSummary';

const baseProps = {
  listingTitle: 'Lawn Mowing Service',
  providerName: 'Green Gardens Co.',
  bookingDate: '2026-07-15',
  startTime: '09:00',
  endTime: '10:00',
  servicePrice: 500,
  platformFee: 40,
  platformFeePercent: 8,
  currency: 'ZAR',
  onPay: vi.fn(),
  onBack: vi.fn(),
};

describe('CheckoutSummary', () => {
  // -- Test 1: Renders service name, price, platform fee, total ------------
  it('renders service name, price, platform fee line item, and total with correct values', () => {
    render(<CheckoutSummary {...baseProps} />);

    // Service name
    expect(screen.getByText('Lawn Mowing Service')).toBeDefined();

    // Provider name
    expect(screen.getByText('by Green Gardens Co.')).toBeDefined();

    // Date/time
    expect(screen.getByText(/2026-07-15 · 09:00 – 10:00/)).toBeDefined();

    // Service price line
    expect(screen.getByText('Service price')).toBeDefined();

    // Platform fee line item — visible per D-08
    expect(screen.getByText('Platform Fee (8%)')).toBeDefined();

    // Total
    expect(screen.getByText('Total')).toBeDefined();
  });

  // -- Test 2: Total = price + platformFee ---------------------------------
  it('computes total = price + platformFee correctly', () => {
    render(<CheckoutSummary {...baseProps} servicePrice={500} platformFee={40} />);

    // Total should be 540
    // en-ZA format: R 540,00 (comma as decimal separator, non-breaking space after R)
    const totalElements = screen.getAllByText(/540,00/);
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });

  // -- Test 3: Platform fee label includes percentage ---------------------
  it('shows "Platform Fee (8%)" label with percentage', () => {
    render(<CheckoutSummary {...baseProps} platformFeePercent={8} />);

    expect(screen.getByText('Platform Fee (8%)')).toBeDefined();
  });

  it('shows dynamic platform fee percentage', () => {
    render(<CheckoutSummary {...baseProps} platformFeePercent={12} />);

    expect(screen.getByText('Platform Fee (12%)')).toBeDefined();
  });

  // -- Test 4: "Confirm & Pay" button calls onPay -------------------------
  it('calls onPay with gateway when "Confirm & Pay" button is clicked', () => {
    const onPay = vi.fn();
    render(<CheckoutSummary {...baseProps} onPay={onPay} />);

    // Click the primary pay button
    const payButton = screen.getByText(/Confirm & Pay/);
    fireEvent.click(payButton);

    expect(onPay).toHaveBeenCalledWith('paystack');
  });

  // -- Test 5: PayPal button conditionally rendered -----------------------
  it('does NOT show PayPal button when showPaypal is false', () => {
    render(<CheckoutSummary {...baseProps} showPaypal={false} />);

    expect(screen.queryByText('Pay with PayPal')).toBeNull();
  });

  it('shows PayPal button when showPaypal is true', () => {
    render(<CheckoutSummary {...baseProps} showPaypal={true} />);

    expect(screen.getByText('Pay with PayPal')).toBeDefined();
  });

  // -- Test 6: PayPal button calls onPay with 'paypal' --------------------
  it('calls onPay with "paypal" when PayPal button is clicked', () => {
    const onPay = vi.fn();
    render(<CheckoutSummary {...baseProps} onPay={onPay} showPaypal={true} />);

    const paypalButton = screen.getByText('Pay with PayPal');
    fireEvent.click(paypalButton);

    expect(onPay).toHaveBeenCalledWith('paypal');
  });

  // -- Test 7: Back button calls onBack -----------------------------------
  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<CheckoutSummary {...baseProps} onBack={onBack} />);

    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // -- Test 8: Loading state disables buttons ------------------------------
  it('disables buttons and shows "Processing..." when loading', () => {
    render(<CheckoutSummary {...baseProps} loading={true} />);

    // Confirm & Pay button shows "Processing..."
    expect(screen.getByText('Processing...')).toBeDefined();

    // The button should be disabled
    const payButton = screen.getByText('Processing...');
    expect(payButton.closest('button')?.disabled).toBe(true);
  });
});
