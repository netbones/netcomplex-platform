'use client';

import { useReducer, useCallback, useMemo } from 'react';
import type { WorkflowConfig, WorkflowState } from './types';
import { createWorkflow } from './createWorkflow';

type WorkflowAction<C extends Record<string, unknown>> =
  | { type: 'NEXT' }
  | { type: 'UPDATE_CTX'; patch: Partial<C> }
  | { type: 'SET_ERROR'; error: string | null };

function createWorkflowReducer<S extends string, C extends Record<string, unknown>>(
  config: WorkflowConfig<S, C>
) {
  return (state: WorkflowState<S, C>, action: WorkflowAction<C>): WorkflowState<S, C> => {
    switch (action.type) {
      case 'UPDATE_CTX': {
        return { ...state, ctx: { ...state.ctx, ...action.patch } };
      }

      case 'SET_ERROR': {
        return { ...state, validationError: action.error };
      }

      case 'NEXT': {
        if (state.isComplete) return state;

        let current: S = state.currentStep;
        const completed: S[] = [...state.completedSteps];

        // Process transitions, auto-skipping steps whose condition returns false
        for (;;) {
          const step = config.steps.find(s => s.id === current);
          if (!step) {
            return {
              ...state,
              validationError: `Invalid workflow state: step "${String(current)}" not found`,
            };
          }

          // Run validation on current step
          if (step.validate) {
            const error = step.validate(state.ctx);
            if (error) return { ...state, validationError: error };
          }

          // Find matching transition (respecting guards)
          const transition = config.transitions.find(t => {
            if (t.from !== current) return false;
            if (t.guard && !t.guard(state.ctx)) return false;
            return true;
          });

          if (!transition) {
            // No matching transition — stay on current step
            return { ...state, completedSteps: completed, validationError: null };
          }

          // Execute side effect
          transition.effect?.(state.ctx);

          // Mark current step as completed
          completed.push(current);

          // Check if workflow is complete
          if (transition.to === ('__complete__' as unknown as S)) {
            config.onComplete?.(state.ctx);
            return {
              ...state,
              isComplete: true,
              completedSteps: completed,
              validationError: null,
            };
          }

          current = transition.to;

          // Check if the next step should be auto-skipped
          const nextStep = config.steps.find(s => s.id === current);
          if (!nextStep?.condition || nextStep.condition(state.ctx)) {
            // Step is valid (no condition, or condition returns true) — stop here
            break;
          }
          // Auto-skip: continue the loop to process the next transition
        }

        return {
          ...state,
          currentStep: current,
          completedSteps: completed,
          validationError: null,
        };
      }

      default:
        return state;
    }
  };
}

function createInitialState<S extends string, C extends Record<string, unknown>>(
  initialStep: S
): WorkflowState<S, C> {
  return {
    currentStep: initialStep,
    ctx: {} as C,
    completedSteps: [],
    isComplete: false,
    validationError: null,
  };
}

/**
 * Generic, type-safe workflow engine hook.
 *
 * Drives a directed-graph workflow: condition-gated steps, guard-blocked transitions,
 * validation hooks, auto-skip for condition=false steps, and an onComplete callback.
 *
 * @param rawConfig - Workflow configuration; validated via createWorkflow
 * @returns Workflow state and mutation callbacks
 */
export function useWorkflow<S extends string, C extends Record<string, unknown>>(
  rawConfig: WorkflowConfig<S, C>
) {
  const config = useMemo(() => createWorkflow(rawConfig), [rawConfig]);

  const reducer = useMemo(() => createWorkflowReducer(config), [config]);

  const [state, dispatch] = useReducer(reducer, config.initialStep, (initialStep: S) =>
    createInitialState<S, C>(initialStep)
  );

  const next = useCallback(() => {
    dispatch({ type: 'NEXT' });
  }, []);

  const updateCtx = useCallback((patch: Partial<C>) => {
    dispatch({ type: 'UPDATE_CTX', patch });
  }, []);

  const currentStepConfig = useMemo(
    () => config.steps.find(s => s.id === state.currentStep)!,
    [config.steps, state.currentStep]
  );

  return {
    currentStep: state.currentStep,
    currentStepConfig,
    ctx: state.ctx,
    updateCtx,
    next,
    completedSteps: state.completedSteps,
    isComplete: state.isComplete,
    validationError: state.validationError,
  };
}
