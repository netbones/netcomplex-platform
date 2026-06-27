'use client';

interface CheckoutSummaryProps {
  listingTitle: string;
  providerName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  servicePrice: number;
  platformFee: number;
  platformFeePercent: number;
  currency?: string;
  onPay: (gateway?: 'paystack' | 'paypal') => void;
  onBack: () => void;
  showPaypal?: boolean;
  loading?: boolean;
}

export function CheckoutSummary({
  listingTitle,
  providerName,
  bookingDate,
  startTime,
  endTime,
  servicePrice,
  platformFee,
  platformFeePercent,
  currency = 'ZAR',
  onPay,
  onBack,
  showPaypal = false,
  loading = false,
}: CheckoutSummaryProps) {
  const total = servicePrice + platformFee;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
    }).format(amount);

  return (
    <div className="space-y-4">
      {/* Back button — 44px touch target per D-16 */}
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-sm text-gray-600 min-w-[44px] min-h-[44px]"
      >
        ← Back
      </button>

      {/* Booking details */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-gray-900">{listingTitle}</h3>
        <p className="text-sm text-gray-600">by {providerName}</p>
        <p className="text-sm text-gray-600">
          {bookingDate} · {startTime} – {endTime}
        </p>
      </div>

      {/* Price breakdown — platform fee as visible line item per D-08 */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Service price</span>
          <span className="font-medium">{formatCurrency(servicePrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span>
          <span className="font-medium">{formatCurrency(platformFee)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Pay button(s) — 44px touch target per D-16 */}
      <div className="space-y-2">
        <button
          onClick={() => onPay('paystack')}
          disabled={loading}
          type="button"
          className="w-full bg-soralia-primary text-white font-semibold py-3 rounded-lg min-h-[44px] disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Confirm & Pay · ${formatCurrency(total)}`}
        </button>
        {showPaypal && (
          <button
            onClick={() => onPay('paypal')}
            disabled={loading}
            type="button"
            className="w-full bg-[#0070BA] text-white font-semibold py-3 rounded-lg min-h-[44px] disabled:opacity-50"
          >
            Pay with PayPal
          </button>
        )}
      </div>
    </div>
  );
}
