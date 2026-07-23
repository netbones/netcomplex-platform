'use client';

import { create } from 'zustand';
import { useEffect, useRef } from 'react';

export type BusEvent = 'page-flags-updated';

interface BusState {
  counters: Record<BusEvent, number>;
  emit: (event: BusEvent) => void;
}

export const useBusStore = create<BusState>()(set => ({
  counters: { 'page-flags-updated': 0 },
  emit: event =>
    set(state => ({
      counters: { ...state.counters, [event]: state.counters[event] + 1 },
    })),
}));

export function emitBusEvent(event: BusEvent): void {
  useBusStore.getState().emit(event);
}

export function useBusEvent(event: BusEvent, handler: () => void): void {
  const counter = useBusStore(s => s.counters[event]);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    handlerRef.current();
  }, [counter]);
}
