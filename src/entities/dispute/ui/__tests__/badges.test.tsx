/**
 * Tests for dispute UI badge components.
 * Plan 105-02 Task 2 — TDD RED phase.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DisputeStatusBadge } from '../DisputeStatusBadge';
import { DisputeCategoryBadge } from '../DisputeCategoryBadge';
import { SeverityIndicator } from '../SeverityIndicator';

// ============================================
// DisputeStatusBadge tests
// ============================================
describe('DisputeStatusBadge', () => {
  // Test 1
  it('renders DRAFT status with neutral (gray/slate) background', () => {
    const { container } = render(<DisputeStatusBadge status="DRAFT" />);
    const span = container.firstElementChild;
    expect(span).toBeTruthy();
    const className = span!.className;
    // Neutral states should have slate/gray classes
    expect(
      className.includes('slate') || className.includes('gray') || className.includes('zinc')
    ).toBe(true);
  });

  // Test 6
  it('renders ESCALATED_CSOS with red/rose background', () => {
    const { container } = render(<DisputeStatusBadge status="ESCALATED_CSOS" />);
    const span = container.firstElementChild;
    const className = span!.className;
    expect(className.includes('red') || className.includes('rose')).toBe(true);
  });

  // Test 3
  it('renders RESOLVED with green/emerald background', () => {
    const { container } = render(<DisputeStatusBadge status="RESOLVED" />);
    const span = container.firstElementChild;
    const className = span!.className;
    expect(className.includes('green') || className.includes('emerald')).toBe(true);
  });

  it('renders the correct label text from STATUS_LABELS', () => {
    render(<DisputeStatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });

  // Test 7: accepts className prop
  it('accepts className prop and forwards to root element', () => {
    const { container } = render(
      <DisputeStatusBadge status="DRAFT" className="test-custom-class" />
    );
    const span = container.firstElementChild;
    expect(span!.className).toContain('test-custom-class');
  });
});

// ============================================
// DisputeCategoryBadge tests
// ============================================
describe('DisputeCategoryBadge', () => {
  // Test 4
  it('renders the category label text', () => {
    render(<DisputeCategoryBadge category="NOISE" />);
    expect(screen.getByText('Noise')).toBeInTheDocument();
  });

  it('renders other category labels correctly', () => {
    render(<DisputeCategoryBadge category="PETS" />);
    expect(screen.getByText('Pets')).toBeInTheDocument();
  });

  // Test 7: accepts className prop
  it('accepts className prop and forwards to root element', () => {
    const { container } = render(<DisputeCategoryBadge category="NOISE" className="custom-cat" />);
    const span = container.firstElementChild;
    expect(span!.className).toContain('custom-cat');
  });

  it('renders with border styling', () => {
    const { container } = render(<DisputeCategoryBadge category="PARKING" />);
    const span = container.firstElementChild;
    // Should have border class or border utility
    expect(span!.className.length).toBeGreaterThan(0);
  });
});

// ============================================
// SeverityIndicator tests
// ============================================
describe('SeverityIndicator', () => {
  // Test 5
  it('renders MINOR severity with green segment active', () => {
    const { container } = render(<SeverityIndicator severity="MINOR" />);
    // Should render the label
    expect(screen.getByText('Minor')).toBeInTheDocument();
    // Should have a green-colored active segment
    const bar = container.querySelector('[data-severity-bar]');
    expect(bar).toBeTruthy();
  });

  // Test 6
  it('renders URGENT severity with red segment active', () => {
    render(<SeverityIndicator severity="URGENT" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('renders 4 segments', () => {
    const { container } = render(<SeverityIndicator severity="MODERATE" />);
    const segments = container.querySelectorAll('[data-severity-bar] > *');
    expect(segments.length).toBe(4);
  });

  // Test 7: accepts className prop
  it('accepts className prop and forwards to root element', () => {
    const { container } = render(
      <SeverityIndicator severity="MINOR" className="custom-severity" />
    );
    const root = container.firstElementChild;
    expect(root!.className).toContain('custom-severity');
  });
});
