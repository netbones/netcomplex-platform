/**
 * Tests for EmotionCheckIn wizard stage component.
 * Plan 107-02 Task 3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmotionCheckIn } from '../EmotionCheckIn';

describe('EmotionCheckIn', () => {
  it('renders 5 emoji buttons with correct labels', () => {
    render(<EmotionCheckIn selected={null} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Very angry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neutral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved' })).toBeInTheDocument();
  });

  it('clicking an emoji calls onSelect with correct value', () => {
    const onSelect = vi.fn();
    render(<EmotionCheckIn selected={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Upset' }));
    expect(onSelect).toHaveBeenCalledWith('upset');
  });

  it('selected button gets highlighted class', () => {
    render(<EmotionCheckIn selected="calm" onSelect={vi.fn()} />);

    const calmButton = screen.getByRole('button', { name: 'Calm' });
    expect(calmButton.className).toContain('bg-indigo-50');
    expect(calmButton.className).toContain('border-soralia-primary');

    // non-selected buttons should not have highlight
    const angryButton = screen.getByRole('button', { name: 'Very angry' });
    expect(angryButton.className).not.toContain('bg-indigo-50');
  });

  it("selecting 'very_angry' shows soft gate banner", () => {
    render(<EmotionCheckIn selected="very_angry" onSelect={vi.fn()} />);

    expect(screen.getByText(/We understand this is difficult/i)).toBeInTheDocument();
  });

  it("selecting 'upset' shows soft gate banner", () => {
    render(<EmotionCheckIn selected="upset" onSelect={vi.fn()} />);

    expect(screen.getByText(/We understand this is difficult/i)).toBeInTheDocument();
  });

  it("selecting 'neutral' does NOT show soft gate banner", () => {
    render(<EmotionCheckIn selected="neutral" onSelect={vi.fn()} />);

    expect(screen.queryByText(/We understand this is difficult/i)).not.toBeInTheDocument();
  });

  it('selected button has aria-pressed set to true', () => {
    render(<EmotionCheckIn selected="resolved" onSelect={vi.fn()} />);

    const resolvedButton = screen.getByRole('button', { name: 'Resolved' });
    expect(resolvedButton.getAttribute('aria-pressed')).toBe('true');
  });
});
