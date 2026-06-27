'use client';

import { useState } from 'react';
import { DatePicker } from './DatePicker';
import { TimeSlotGrid } from './TimeSlotGrid';
import { CheckoutSummary } from './CheckoutSummary';

type Step = 'date' | 'time' | 'confirm';

interface BookingBottomSheetProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    priceType?: string;
    price?: number;
    currency?: string;
    images?: string[];
    verified?: boolean;
    rating?: number;
    reviewCount?: number;
    provider?: { id?: string; name?: string; email?: string; avatar?: string };
    availability: Record<string, { start: string; end: string }[]>;
  };
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: (bookingId: string) => void;
}

export function BookingBottomSheet({
  listing,
  isOpen,
  onClose,
  onBookingComplete: _onBookingComplete,
}: BookingBottomSheetProps) {
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [bookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  if (!isOpen) return null;

  const steps: Step[] = ['date', 'time', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  const handleClose = () => {
    setStep('date');
    setSelectedDate(null);
    setSelectedSlot(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 z-40 border-0 cursor-pointer"
        onClick={handleClose}
        aria-label="Close booking sheet"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300">
        {/* Safe-area wrapper — D-16 */}
        <div className="pb-[env(safe-area-inset-bottom,16px)]">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto my-3" />

          {/* Close button — D-16 */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Close"
          >
            ×
          </button>

          {/* Step indicator — 3 dots */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  step === s
                    ? 'bg-soralia-primary'
                    : i < currentStepIndex
                      ? 'bg-green-400'
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="px-4 pb-6">
            {step === 'date' && (
              <DatePicker
                availability={listing.availability}
                onSelect={date => {
                  setSelectedDate(date);
                  setStep('time');
                }}
              />
            )}

            {step === 'time' && selectedDate && (
              <TimeSlotGrid
                availability={listing.availability}
                date={selectedDate}
                bookedSlots={bookedSlots}
                onSelect={slot => {
                  setSelectedSlot(slot);
                  setStep('confirm');
                }}
                onBack={() => setStep('date')}
              />
            )}

            {step === 'confirm' && selectedDate && selectedSlot && (
              <CheckoutSummary
                listingTitle={listing.title}
                providerName={listing.provider?.name || 'Provider'}
                bookingDate={selectedDate}
                startTime={selectedSlot.start}
                endTime={selectedSlot.end}
                servicePrice={listing.price || 0}
                platformFee={0}
                platformFeePercent={8}
                currency={listing.currency || 'ZAR'}
                onPay={() => {
                  // Payment flow would go here
                }}
                onBack={() => setStep('time')}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
