// Amenity status computation logic
import type { Amenity, AmenityStatus, AmenityWithStatus, TimeSlot } from './types';

/**
 * Compute the status of an amenity based on current time and hours
 */
export function computeAmenityStatus(amenity: Amenity, now: Date = new Date()): AmenityWithStatus {
  const status = getStatus(now, amenity.hoursOpen, amenity.hoursClose);
  
  return {
    ...amenity,
    computedStatus: status.status,
    statusText: status.text,
  };
}

function getStatus(now: Date, hoursOpen: string | null, hoursClose: string | null): { status: AmenityStatus; text: string } {
  // Always open case
  if (!hoursOpen || !hoursClose) {
    return { status: 'always_open', text: 'Always open' };
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = hoursOpen.split(':').map(Number);
  const [closeHour, closeMin] = hoursClose.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  // Check if within operating hours
  if (currentTime >= openTime && currentTime < closeTime) {
    // Check if closes within 1 hour
    const minutesUntilClose = closeTime - currentTime;
    if (minutesUntilClose <= 60) {
      const closeHourDisplay = closeHour.toString().padStart(2, '0');
      const closeMinDisplay = closeMin.toString().padStart(2, '0');
      return { status: 'closes_soon', text: `Closes ${closeHourDisplay}:${closeMinDisplay}` };
    }
    return { status: 'open', text: 'Open' };
  }

  // Outside operating hours
  return { status: 'closed', text: 'Closed' };
}

/**
 * Generate time slots for a given date and amenity
 */
export function generateTimeSlots(
  hoursOpen: string | null,
  hoursClose: string | null,
  slotDurationMins: number,
  date: Date,
  existingBookings: Array<{ startTime: string; endTime: string }> = []
): TimeSlot[] {
  if (!hoursOpen || !hoursClose || !slotDurationMins) {
    return [];
  }

  const [openHour, openMin] = hoursOpen.split(':').map(Number);
  const [closeHour, closeMin] = hoursClose.split(':').map(Number);
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  const slots: TimeSlot[] = [];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  for (let time = openMinutes; time < closeMinutes; time += slotDurationMins) {
    const hour = Math.floor(time / 60);
    const min = time % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    // Check if slot is in the past for today
    const isInPast = isToday && time <= currentMinutes;

    // Check if slot is already booked
    const isBooked = existingBookings.some(booking => {
      const [bookStartHour, bookStartMin] = booking.startTime.split(':').map(Number);
      const bookStartMinutes = bookStartHour * 60 + bookStartMin;
      return bookStartMinutes === time;
    });

    slots.push({
      time: timeStr,
      available: !isInPast && !isBooked,
      booked: isBooked,
    });
  }

  return slots;
}

/**
 * Format hours for display
 */
export function formatHours(hoursOpen: string | null, hoursClose: string | null): string {
  if (!hoursOpen || !hoursClose) {
    return 'Always open';
  }
  return `${hoursOpen} – ${hoursClose}`;
}
