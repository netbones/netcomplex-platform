import type { WorkflowConfig } from './types';

/**
 * Validates and returns a workflow config. Throws descriptive errors for invalid configs.
 * - Every step.id referenced in transitions must exist in steps
 * - initialStep must exist in steps
 */
export function createWorkflow<S extends string, C extends Record<string, unknown>>(
  config: WorkflowConfig<S, C>
): WorkflowConfig<S, C> {
  const stepIds = new Set(config.steps.map(s => s.id));

  if (!stepIds.has(config.initialStep)) {
    throw new Error(
      `Invalid workflow config: initialStep "${config.initialStep}" not found in steps. Available steps: ${[...stepIds].join(', ')}`
    );
  }

  for (const transition of config.transitions) {
    if (!stepIds.has(transition.from)) {
      throw new Error(
        `Invalid workflow config: transition from "${transition.from}" references a step not in the steps array. Available steps: ${[...stepIds].join(', ')}`
      );
    }
    // '__complete__' is a terminal sentinel, not a real step — skip validation for 'to'
    if (transition.to !== ('__complete__' as S) && !stepIds.has(transition.to)) {
      throw new Error(
        `Invalid workflow config: transition to "${transition.to}" references a step not in the steps array. Available steps: ${[...stepIds].join(', ')}`
      );
    }
  }

  return config;
}
