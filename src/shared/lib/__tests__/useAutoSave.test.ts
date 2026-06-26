import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

interface TestData {
  name: string;
  count: number;
}

/**
 * Creates a fresh mock localStorage with a backing store,
 * and stubs it globally for each test.
 */
function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => {
      const keys = [...store.keys()];
      return keys[index] ?? null;
    }),
  };
}

describe('useAutoSave', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = createMockStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Test 1: persists data to localStorage via debounce
  it('persists data to localStorage after debounce delay', () => {
    const initialData: TestData = { name: 'test', count: 1 };
    const { result, rerender } = renderHook(
      ({ data }: { data: TestData }) => useAutoSave<TestData>({ key: 'my-key', data, delay: 2000 }),
      { initialProps: { data: initialData } }
    );

    // useDebounceValue returns initial value immediately on first render
    expect(result.current.savedData).toEqual(initialData);

    // Update data — debounce should delay the save
    const updatedData: TestData = { name: 'test', count: 2 };
    rerender({ data: updatedData });

    // Advance timers past the debounce delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(storage.setItem).toHaveBeenCalledWith('my-key', JSON.stringify(updatedData));
    expect(result.current.savedData).toEqual(updatedData);
  });

  // Test 2: with enabled=false does NOT persist data
  it('does NOT persist data when enabled is false', () => {
    const data: TestData = { name: 'test', count: 1 };
    renderHook(() => useAutoSave<TestData>({ key: 'my-key', data, delay: 100, enabled: false }));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  // Test 3: secondsSinceSave increments after save completes
  it('increments secondsSinceSave after save completes', () => {
    const data: TestData = { name: 'test', count: 1 };
    const { result } = renderHook(() => useAutoSave<TestData>({ key: 'my-key', data, delay: 100 }));

    // Trigger save
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Immediately after save, should be 0 or close to 0
    expect(result.current.secondsSinceSave).toBe(0);

    // Advance 3 more seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsSinceSave).toBeGreaterThanOrEqual(3);
  });

  // Test 4: On mount with existing localStorage data, savedData returns the restored value
  it('restores savedData from localStorage on mount', () => {
    const existingData: TestData = { name: 'restored', count: 42 };
    storage.getItem.mockReturnValue(JSON.stringify(existingData));

    const { result } = renderHook(() =>
      useAutoSave<TestData>({ key: 'my-key', data: { name: 'new', count: 0 }, delay: 2000 })
    );

    expect(result.current.savedData).toEqual(existingData);
  });

  // Test 5: clearSaved() removes the localStorage key and resets savedData to null
  it('clearSaved() removes localStorage key and resets savedData', () => {
    const data: TestData = { name: 'test', count: 1 };
    const { result } = renderHook(() => useAutoSave<TestData>({ key: 'my-key', data, delay: 100 }));

    // Force a save first
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(storage.setItem).toHaveBeenCalled();

    // Now clear
    act(() => {
      result.current.clearSaved();
    });

    expect(storage.removeItem).toHaveBeenCalledWith('my-key');
    expect(result.current.savedData).toBeNull();
  });
});
