/**
 * Tests for SelfResolutionChecklist wizard stage component.
 * Plan 107-02 Task 3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelfResolutionChecklist } from '../SelfResolutionChecklist';

describe('SelfResolutionChecklist', () => {
  const defaultChecked: Record<string, boolean> = {};

  it('renders 4 checkboxes with correct labels', () => {
    render(<SelfResolutionChecklist checked={defaultChecked} onToggle={vi.fn()} />);

    expect(screen.getByLabelText('I have spoken to the other party directly')).toBeInTheDocument();
    expect(screen.getByLabelText('I have checked the community rules')).toBeInTheDocument();
    expect(
      screen.getByLabelText('I have given reasonable time for resolution')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('I believe third-party help is needed')).toBeInTheDocument();
  });

  it('toggling a checkbox calls onToggle with correct id', () => {
    const onToggle = vi.fn();
    render(<SelfResolutionChecklist checked={defaultChecked} onToggle={onToggle} />);

    fireEvent.click(screen.getByLabelText('I have checked the community rules'));
    expect(onToggle).toHaveBeenCalledWith('checked_rules');
  });

  it('when 0 boxes checked, contextual tip is visible', () => {
    render(<SelfResolutionChecklist checked={{}} onToggle={vi.fn()} />);

    expect(screen.getByText(/Consider resolving directly/i)).toBeInTheDocument();
  });

  it('when 1 box checked, contextual tip is visible', () => {
    render(<SelfResolutionChecklist checked={{ spoke_directly: true }} onToggle={vi.fn()} />);

    expect(screen.getByText(/Consider resolving directly/i)).toBeInTheDocument();
  });

  it('when 2+ boxes checked, contextual tip is NOT visible', () => {
    render(
      <SelfResolutionChecklist
        checked={{ spoke_directly: true, checked_rules: true }}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByText(/Consider resolving directly/i)).not.toBeInTheDocument();
  });

  it('checkbox containers have h-11 touch target class', () => {
    const { container } = render(
      <SelfResolutionChecklist checked={defaultChecked} onToggle={vi.fn()} />
    );

    // Each label has the h-11 class for touch targets
    const labels = container.querySelectorAll('label');
    expect(labels.length).toBe(4);
    labels.forEach(label => {
      expect(label.className).toContain('h-11');
    });
  });
});
