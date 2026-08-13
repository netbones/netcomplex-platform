'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { apiGet } from '@/shared/api/http-client';
import { createComponentLogger } from '@/shared/lib';
import { formatDateKey, isBeforeDay, isSameDay, type AmenityWithStatus } from '@entities/amenity';
import { computeAmenityStatus } from '@entities/amenity';

const log = createComponentLogger('AmenitiesCalendarTab');

interface CalendarAmenity {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  colorIndex: number;
  colorHex: string;
  colorKey: string;
  hoursOpen: string | null;
  hoursClose: string | null;
  slotDurationMins: number | null;
  photoUrl: string | null;
  rulesText: string | null;
  bookable: boolean;
  maxOccupancy: number | null;
  waitlistEnabled: boolean;
  contactEnabled: boolean;
  contactPhone: string | null;
  description: string | null;
  active: boolean;
  tenantId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
}

interface MonthResponse {
  year: number;
  month: number;
  amenities: CalendarAmenity[];
  days: Record<string, string[]>;
  dotCap: number;
}

interface AgendaSlot {
  amenityId: string;
  amenityName: string;
  colorHex: string;
  colorKey: string;
  startTime: string;
  endTime: string;
  state: 'available' | 'booked' | 'mine';
}

interface DayResponse {
  date: string;
  slots: AgendaSlot[];
}

interface AmenitiesCalendarTabProps {
  onBookSlot: (amenity: AmenityWithStatus, date: Date, startTime: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function agendaHeading(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function toAmenityWithStatus(a: CalendarAmenity): AmenityWithStatus {
  return computeAmenityStatus({
    id: a.id,
    tenantId: a.tenantId,
    name: a.name,
    description: a.description,
    icon: a.icon,
    photoUrl: a.photoUrl,
    hoursOpen: a.hoursOpen,
    hoursClose: a.hoursClose,
    bookable: a.bookable,
    contactEnabled: a.contactEnabled,
    contactPhone: a.contactPhone,
    maxOccupancy: a.maxOccupancy,
    slotDurationMins: a.slotDurationMins,
    rulesText: a.rulesText,
    waitlistEnabled: a.waitlistEnabled,
    sortOrder: a.sortOrder,
    active: a.active,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
    deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
  });
}

export function AmenitiesCalendarTab({ onBookSlot }: AmenitiesCalendarTabProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [monthData, setMonthData] = useState<MonthResponse | null>(null);
  const [agenda, setAgenda] = useState<AgendaSlot[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of monthData?.amenities ?? []) {
      map.set(a.id, a.colorHex);
    }
    return map;
  }, [monthData]);

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const params: Record<string, string> = {
        year: String(year),
        month: String(month),
      };
      if (filterId) params.amenityId = filterId;
      const { data } = await apiGet<MonthResponse>('/api/amenities/calendar', params);
      setMonthData(data);
    } catch (err) {
      log.error({ year, month }, 'Failed to load calendar month', err);
      setMonthData(null);
    } finally {
      setLoadingMonth(false);
    }
  }, [year, month, filterId]);

  const loadDay = useCallback(
    async (date: Date) => {
      if (isBeforeDay(date, today)) {
        setAgenda([]);
        return;
      }
      setLoadingDay(true);
      try {
        const params: Record<string, string> = { date: formatDateKey(date) };
        if (filterId) params.amenityId = filterId;
        const { data } = await apiGet<DayResponse>('/api/amenities/calendar/day', params);
        setAgenda(data.slots ?? []);
      } catch (err) {
        log.error({ date }, 'Failed to load calendar day', err);
        setAgenda([]);
      } finally {
        setLoadingDay(false);
      }
    },
    [filterId, today]
  );

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    void loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  const gridCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startPad = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      cells.push({ date, key: formatDateKey(date) });
    }
    return cells;
  }, [year, month]);

  const canGoPrev = useMemo(() => {
    const prevMonthEnd = new Date(year, month - 1, 0);
    return !isBeforeDay(prevMonthEnd, today);
  }, [year, month, today]);

  const goPrev = () => {
    if (!canGoPrev) return;
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const selectDay = (date: Date) => {
    if (isBeforeDay(date, today)) return;
    setSelectedDate(date);
  };

  const amenityMap = useMemo(() => {
    const map = new Map<string, CalendarAmenity>();
    for (const a of monthData?.amenities ?? []) map.set(a.id, a);
    return map;
  }, [monthData]);

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilterId(null)}
          className={cn(
            'px-3 py-1.5 text-sm whitespace-nowrap rounded-full border-2 transition',
            filterId == null
              ? 'border-indigo-600 text-indigo-600 font-medium'
              : 'border-gray-200 text-gray-700 hover:border-gray-300'
          )}
        >
          All
        </button>
        {(monthData?.amenities ?? []).map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => setFilterId(prev => (prev === a.id ? null : a.id))}
            className={cn(
              'px-3 py-1.5 text-sm whitespace-nowrap rounded-full border-2 transition inline-flex items-center gap-1.5',
              filterId === a.id
                ? 'border-indigo-600 text-indigo-600 font-medium'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            )}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: a.colorHex }}
              aria-hidden
            />
            {a.name}
          </button>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-medium text-[15px] text-gray-900">{monthLabel(year, month)}</span>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="p-1.5 rounded-md hover:bg-gray-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1 mb-6 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="text-[11px] text-gray-400 py-1">
            {d}
          </div>
        ))}
        {loadingMonth
          ? Array.from({ length: 28 }).map((_, i) => (
              <div key={`sk-${i}`} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))
          : gridCells.map(cell => {
              if (!cell.date) {
                return <div key={cell.key} />;
              }
              const past = isBeforeDay(cell.date, today);
              const selected = isSameDay(cell.date, selectedDate);
              const amenityIds = monthData?.days[cell.key] ?? [];

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(cell.date!)}
                  className={cn(
                    'relative py-1.5 text-sm rounded-lg transition min-h-[40px]',
                    past && 'text-gray-300 cursor-default',
                    !past && !selected && 'text-gray-800 hover:bg-gray-50',
                    selected && 'bg-indigo-600 text-white font-medium'
                  )}
                >
                  {cell.date.getDate()}
                  {amenityIds.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-0.5">
                      {amenityIds.map(id => (
                        <span
                          key={id}
                          className="w-[5px] h-[5px] rounded-full inline-block"
                          style={{
                            backgroundColor: selected
                              ? 'rgba(255,255,255,0.9)'
                              : (colorById.get(id) ?? '#9ca3af'),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
      </div>

      {/* Day agenda */}
      <p className="text-sm text-gray-500 mb-2.5">{agendaHeading(selectedDate)}</p>

      {loadingDay ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : agenda.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          {isSameDay(selectedDate, today) ? 'No activity today' : 'No activity on this day'}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {agenda.map(slot => {
            const isAvailable = slot.state === 'available';
            return (
              <div
                key={`${slot.amenityId}-${slot.startTime}-${slot.state}`}
                className={cn(
                  'bg-white border rounded-xl px-3.5 py-3 flex items-center gap-3',
                  isAvailable ? 'border-dashed border-gray-300' : 'border-gray-200'
                )}
              >
                <div className="w-11 text-center text-xs text-gray-500 leading-tight shrink-0">
                  {slot.startTime}
                  <br />
                  {slot.endTime}
                </div>
                <div
                  className="w-[3px] self-stretch rounded-sm shrink-0"
                  style={{ backgroundColor: slot.colorHex }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {slot.amenityName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isAvailable ? 'Available' : 'Booked'}
                  </div>
                </div>
                {slot.state === 'mine' && (
                  <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-md shrink-0">
                    You
                  </span>
                )}
                {isAvailable && (
                  <button
                    type="button"
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 shrink-0"
                    onClick={() => {
                      const amenity = amenityMap.get(slot.amenityId);
                      if (!amenity) return;
                      onBookSlot(toAmenityWithStatus(amenity), selectedDate, slot.startTime);
                    }}
                  >
                    Book
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
