import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from '../useWorkflow';
import type { WorkflowConfig } from '../types';

type TestStep = 'stepA' | 'stepB' | 'stepC';
interface TestCtx extends Record<string, unknown> {
  field?: string;
  flag?: boolean;
}

/**
 * Minimal step component factory for testing.
 * The component prop is required by WorkflowStep but components aren't rendered in unit tests.
 */
function stepComponent() {
  return null as unknown as React.ComponentType<{
    ctx: TestCtx;
    updateCtx: (patch: Partial<TestCtx>) => void;
  }>;
}

function makeLinearConfig(
  overrides?: Partial<WorkflowConfig<TestStep, TestCtx>>
): WorkflowConfig<TestStep, TestCtx> {
  return {
    steps: [
      { id: 'stepA', component: stepComponent() },
      { id: 'stepB', component: stepComponent() },
      { id: 'stepC', component: stepComponent() },
    ],
    transitions: [
      { from: 'stepA', to: 'stepB' },
      { from: 'stepB', to: 'stepC' },
      { from: 'stepC', to: '__complete__' as TestStep },
    ],
    initialStep: 'stepA',
    onComplete: vi.fn(),
    ...overrides,
  };
}

describe('useWorkflow', () => {
  // Test 1: Linear forward-only transitions through a 3-step config
  it('advances through a linear 3-step workflow and marks isComplete', () => {
    const config = makeLinearConfig();
    const { result } = renderHook(() => useWorkflow(config));

    expect(result.current.currentStep).toBe('stepA');
    expect(result.current.isComplete).toBe(false);

    act(() => {
      result.current.next();
    });
    expect(result.current.currentStep).toBe('stepB');

    act(() => {
      result.current.next();
    });
    expect(result.current.currentStep).toBe('stepC');

    act(() => {
      result.current.next();
    });
    expect(result.current.isComplete).toBe(true);
  });

  // Test 2: Step with condition: () => false is auto-skipped
  it('auto-skips a step when its condition returns false', () => {
    const config = makeLinearConfig({
      steps: [
        { id: 'stepA', component: stepComponent() },
        { id: 'stepB', component: stepComponent(), condition: () => false },
        { id: 'stepC', component: stepComponent() },
      ],
    });
    const { result } = renderHook(() => useWorkflow(config));

    expect(result.current.currentStep).toBe('stepA');
    act(() => {
      result.current.next();
    });
    // stepB should be skipped, landing on stepC
    expect(result.current.currentStep).toBe('stepC');
  });

  // Test 3: Step with validate returning an error string blocks next()
  it('blocks next() when validation returns an error and preserves currentStep', () => {
    const config = makeLinearConfig({
      steps: [
        { id: 'stepA', component: stepComponent(), validate: () => 'field is required' },
        { id: 'stepB', component: stepComponent() },
        { id: 'stepC', component: stepComponent() },
      ],
    });
    const { result } = renderHook(() => useWorkflow(config));

    expect(result.current.currentStep).toBe('stepA');
    act(() => {
      result.current.next();
    });
    expect(result.current.currentStep).toBe('stepA');
    expect(result.current.validationError).toBe('field is required');
  });

  // Test 4: updateCtx merges into ctx and is retrievable on next render
  it('merges partial context via updateCtx and exposes it on next render', () => {
    const config = makeLinearConfig();
    const { result } = renderHook(() => useWorkflow(config));

    act(() => {
      result.current.updateCtx({ field: 'hello' });
    });
    expect(result.current.ctx.field).toBe('hello');

    act(() => {
      result.current.updateCtx({ flag: true });
    });
    expect(result.current.ctx.field).toBe('hello');
    expect(result.current.ctx.flag).toBe(true);
  });

  // Test 5: Transition with guard returning false blocks the transition
  it('blocks a transition when guard returns false and keeps currentStep unchanged', () => {
    const config = makeLinearConfig({
      transitions: [
        { from: 'stepA', to: 'stepB', guard: () => false },
        { from: 'stepB', to: 'stepC' },
        { from: 'stepC', to: '__complete__' as TestStep },
      ],
    });
    const { result } = renderHook(() => useWorkflow(config));

    expect(result.current.currentStep).toBe('stepA');
    act(() => {
      result.current.next();
    });
    // Guard blocked — should stay at stepA
    expect(result.current.currentStep).toBe('stepA');
  });

  // Test 6: Transition with effect executes the effect during next()
  it('executes a transition effect during next()', () => {
    const effect = vi.fn();
    const config = makeLinearConfig({
      transitions: [
        { from: 'stepA', to: 'stepB', effect },
        { from: 'stepB', to: 'stepC' },
        { from: 'stepC', to: '__complete__' as TestStep },
      ],
    });
    const { result } = renderHook(() => useWorkflow(config));

    act(() => {
      result.current.next();
    });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  // Test 7: completedSteps accumulates step IDs in traversal order
  it('accumulates step IDs in completedSteps in traversal order', () => {
    const config = makeLinearConfig();
    const { result } = renderHook(() => useWorkflow(config));

    act(() => {
      result.current.next();
    });
    expect(result.current.completedSteps).toEqual(['stepA']);

    act(() => {
      result.current.next();
    });
    expect(result.current.completedSteps).toEqual(['stepA', 'stepB']);

    act(() => {
      result.current.next();
    });
    expect(result.current.completedSteps).toEqual(['stepA', 'stepB', 'stepC']);
  });

  // Test 8: onComplete is called when workflow reaches a transition with to: '__complete__'
  it('calls onComplete when workflow reaches the __complete__ transition', () => {
    const onComplete = vi.fn();
    const config = makeLinearConfig({ onComplete });
    const { result } = renderHook(() => useWorkflow(config));

    act(() => {
      result.current.next();
    }); // stepA → stepB
    act(() => {
      result.current.next();
    }); // stepB → stepC
    act(() => {
      result.current.next();
    }); // stepC → __complete__

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isComplete).toBe(true);
  });
});
