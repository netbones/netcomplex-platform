import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SwipeableServiceCard } from '@features/marketplace';
import type { ServiceListing } from '@entities/service';

const mockService: ServiceListing = {
  id: 'svc-001',
  title: 'Lawn Mowing Service',
  description: 'Professional lawn mowing for your property',
  category: 'gardening',
  priceType: 'FIXED',
  price: 250,
  currency: 'ZAR',
  serviceAreas: ['North Riding'],
  images: [],
  verified: true,
  rating: 4.5,
  reviewCount: 12,
  provider: {
    id: 'prov-001',
    name: 'GreenThumb Gardening',
    email: 'green@example.com',
  },
  isPublished: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('SwipeableServiceCard', () => {
  it('renders title, rating, price, provider name', () => {
    const { getByText } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={vi.fn()}
        onBook={vi.fn()}
        onCardClick={vi.fn()}
      />
    );

    expect(getByText('Lawn Mowing Service')).toBeDefined();
    expect(getByText('GreenThumb Gardening')).toBeDefined();
    expect(getByText('(12)')).toBeDefined();
  });

  it('calls onCardClick when card is clicked (no swipe)', () => {
    const onCardClick = vi.fn();
    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={vi.fn()}
        onBook={vi.fn()}
        onCardClick={onCardClick}
      />
    );

    // Find the inner card content div and click it
    const cardContent = container.querySelector('[class*="relative z-10"]');
    if (cardContent) {
      fireEvent.click(cardContent);
      expect(onCardClick).toHaveBeenCalledWith('svc-001');
    }
  });

  it('has touch-action: pan-y on scroll container', () => {
    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={vi.fn()}
        onBook={vi.fn()}
        onCardClick={vi.fn()}
      />
    );

    const outerContainer = container.firstChild as HTMLElement;
    const style = outerContainer.getAttribute('style');
    expect(style).toContain('touch-action');
  });

  it('swipe right beyond threshold fires onInquire callback', () => {
    const onInquire = vi.fn();
    const onBook = vi.fn();
    const onCardClick = vi.fn();

    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={onInquire}
        onBook={onBook}
        onCardClick={onCardClick}
      />
    );

    // Find the card element that has the touch handlers
    const cardElement = container.querySelector('[class*="relative z-10"]') as HTMLElement;
    expect(cardElement).toBeDefined();

    // Dispatch touch events with properly constructed Touch objects
    // using Object.defineProperty to ensure touches are accessible
    function dispatchTouch(
      el: HTMLElement,
      type: 'touchstart' | 'touchmove' | 'touchend',
      cx: number,
      cy: number,
      touchesData?: Array<{ clientX: number; clientY: number }>
    ) {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const touchList = touchesData?.map((t, idx) => ({
        identifier: idx,
        target: el,
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.clientX,
        pageY: t.clientY,
      })) ?? [{ identifier: 0, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy }];

      Object.defineProperties(event, {
        touches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => (type !== 'touchend' ? touchList : []) as any,
          configurable: true,
        },
        changedTouches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => touchList as any,
          configurable: true,
        },
      });

      el.dispatchEvent(event);
    }

    // Swipe right: start at x=200, move to x=300 (100px right, > 80px threshold)
    dispatchTouch(cardElement, 'touchstart', 200, 300);
    dispatchTouch(cardElement, 'touchmove', 250, 305, [{ clientX: 250, clientY: 305 }]);
    dispatchTouch(cardElement, 'touchend', 300, 305, [{ clientX: 300, clientY: 305 }]);

    expect(onInquire).toHaveBeenCalledWith('svc-001');
    expect(onBook).not.toHaveBeenCalled();
  });

  it('swipe left beyond threshold fires onBook callback', () => {
    const onInquire = vi.fn();
    const onBook = vi.fn();
    const onCardClick = vi.fn();

    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={onInquire}
        onBook={onBook}
        onCardClick={onCardClick}
      />
    );

    const cardElement = container.querySelector('[class*="relative z-10"]') as HTMLElement;

    function dispatchTouch(
      el: HTMLElement,
      type: 'touchstart' | 'touchmove' | 'touchend',
      cx: number,
      cy: number,
      touchesData?: Array<{ clientX: number; clientY: number }>
    ) {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const touchList = touchesData?.map((t, idx) => ({
        identifier: idx,
        target: el,
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.clientX,
        pageY: t.clientY,
      })) ?? [{ identifier: 0, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy }];

      Object.defineProperties(event, {
        touches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => (type !== 'touchend' ? touchList : []) as any,
          configurable: true,
        },
        changedTouches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => touchList as any,
          configurable: true,
        },
      });

      el.dispatchEvent(event);
    }

    // Swipe left: start at x=300, move to x=200 (100px left, > 80px threshold)
    dispatchTouch(cardElement, 'touchstart', 300, 300);
    dispatchTouch(cardElement, 'touchmove', 250, 305, [{ clientX: 250, clientY: 305 }]);
    dispatchTouch(cardElement, 'touchend', 200, 305, [{ clientX: 200, clientY: 305 }]);

    expect(onBook).toHaveBeenCalledWith('svc-001');
    expect(onInquire).not.toHaveBeenCalled();
  });

  it('sub-threshold swipe does not fire callbacks', () => {
    const onInquire = vi.fn();
    const onBook = vi.fn();

    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={onInquire}
        onBook={onBook}
        onCardClick={vi.fn()}
      />
    );

    const cardElement = container.querySelector('[class*="relative z-10"]') as HTMLElement;

    function dispatchTouch(
      el: HTMLElement,
      type: 'touchstart' | 'touchmove' | 'touchend',
      cx: number,
      cy: number,
      touchesData?: Array<{ clientX: number; clientY: number }>
    ) {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const touchList = touchesData?.map((t, idx) => ({
        identifier: idx,
        target: el,
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.clientX,
        pageY: t.clientY,
      })) ?? [{ identifier: 0, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy }];

      Object.defineProperties(event, {
        touches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => (type !== 'touchend' ? touchList : []) as any,
          configurable: true,
        },
        changedTouches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => touchList as any,
          configurable: true,
        },
      });

      el.dispatchEvent(event);
    }

    // Small swipe (40px right, below 80px threshold)
    dispatchTouch(cardElement, 'touchstart', 200, 300);
    dispatchTouch(cardElement, 'touchmove', 240, 305, [{ clientX: 240, clientY: 305 }]);
    dispatchTouch(cardElement, 'touchend', 240, 305, [{ clientX: 240, clientY: 305 }]);

    expect(onInquire).not.toHaveBeenCalled();
    expect(onBook).not.toHaveBeenCalled();
  });

  it('swipe actions do not fire during vertical scroll (Pitfall 5)', () => {
    const onInquire = vi.fn();
    const onBook = vi.fn();

    const { container } = render(
      <SwipeableServiceCard
        service={mockService}
        onInquire={onInquire}
        onBook={onBook}
        onCardClick={vi.fn()}
      />
    );

    const cardElement = container.querySelector('[class*="relative z-10"]') as HTMLElement;

    function dispatchTouch(
      el: HTMLElement,
      type: 'touchstart' | 'touchmove' | 'touchend',
      cx: number,
      cy: number,
      touchesData?: Array<{ clientX: number; clientY: number }>
    ) {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const touchList = touchesData?.map((t, idx) => ({
        identifier: idx,
        target: el,
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.clientX,
        pageY: t.clientY,
      })) ?? [{ identifier: 0, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy }];

      Object.defineProperties(event, {
        touches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => (type !== 'touchend' ? touchList : []) as any,
          configurable: true,
        },
        changedTouches: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          get: () => touchList as any,
          configurable: true,
        },
      });

      el.dispatchEvent(event);
    }

    // Vertical scroll (mostly vertical movement, slight horizontal)
    dispatchTouch(cardElement, 'touchstart', 200, 300);
    dispatchTouch(cardElement, 'touchmove', 205, 200, [{ clientX: 205, clientY: 200 }]);
    dispatchTouch(cardElement, 'touchend', 205, 200, [{ clientX: 205, clientY: 200 }]);

    expect(onInquire).not.toHaveBeenCalled();
    expect(onBook).not.toHaveBeenCalled();
  });
});
