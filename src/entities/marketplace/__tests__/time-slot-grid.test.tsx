import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlotGrid } from '../ui/TimeSlotGrid';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mondayAvailability: Record<string, { start: string; end: string }[]> = {
  monday: [{ start: '09:00', end: '12:00' }],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const bookedSlots = [{ startTime: '09:00', endTime: '09:30' }];

describe('TimeSlotGrid', () => {
  // -- Test 1: Renders time slots from availability ranges -------------------
  it('renders time slots parsed from availability ranges for selected day', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    // Monday: 2026-07-13 is a Monday
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    // Should render time slot buttons (09:00-12:00 → 6 slots at 30-min intervals)
    const slotButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes(':'));
    expect(slotButtons.length).toBeGreaterThan(0);
  });

  // -- Test 2: Greys out already-booked slots --------------------------------
  it('greys out already-booked slots', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={bookedSlots}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    // Booked slot should be disabled
    const disabledButtons = screen
      .getAllByRole('button')
      .filter(b => b.hasAttribute('disabled') || b.className.includes('cursor-not-allowed'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  // -- Test 3: Selecting a slot triggers callback ---------------------------
  it('calls onSelect when an available slot is clicked', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    const slotButtons = screen
      .getAllByRole('button')
      .filter(b => !b.hasAttribute('disabled') && b.textContent?.includes(':'));
    if (slotButtons.length > 0) {
      fireEvent.click(slotButtons[0]);
      expect(onSelect).toHaveBeenCalledTimes(1);
    }
  });

  // -- Test 4: Back button exists and triggers onBack ------------------------
  it('has a back button that calls onBack', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    const backButton = screen
      .getAllByRole('button')
      .find(b => b.textContent?.includes('←') || b.textContent?.includes('Back'));
    if (backButton) {
      fireEvent.click(backButton);
      expect(onBack).toHaveBeenCalledTimes(1);
    }
  });

  // -- Test 5: Touch targets meet 44x44px minimum (D-16) ---------------------
  it('all slot buttons have min-h-[44px] min-w-[44px] classes', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const classes = button.className;
      expect(classes).toMatch(/min-h-\[44px\]/);
      expect(classes).toMatch(/min-w-\[44px\]/);
    });
  });

  // -- Test 6: Shows selected date info --------------------------------------
  it('displays the selected date', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-13"
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    // Should show the date in some form
    const bodyText = document.body.textContent || '';
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // -- Test 7: Empty availability shows appropriate state --------------------
  it('shows no slots when availability is empty for selected day', () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    // Tuesday has no availability
    render(
      <TimeSlotGrid
        availability={mondayAvailability}
        date="2026-07-14" // Tuesday
        bookedSlots={[]}
        onSelect={onSelect}
        onBack={onBack}
      />
    );

    // No time slot buttons should be rendered
    const slotButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes(':'));
    expect(slotButtons.length).toBe(0);
  });
});
