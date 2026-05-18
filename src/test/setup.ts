import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock server-only package for tests
vi.mock('server-only', () => ({}));

window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

// Mock scrollIntoView for tests
Element.prototype.scrollIntoView = vi.fn();
