export interface WorkflowStepProps<C extends Record<string, unknown>> {
  ctx: C;
  updateCtx: (patch: Partial<C>) => void;
}

export interface WorkflowStep<S extends string, C extends Record<string, unknown>> {
  id: S;
  component: React.ComponentType<WorkflowStepProps<C>>;
  /** Condition evaluated before entering this step. If returns false, step is auto-skipped. */
  condition?: (ctx: C) => boolean;
  /** Validation run before allowing transition forward. Returns error string or null. */
  validate?: (ctx: C) => string | null;
}

export interface WorkflowTransition<S extends string, C extends Record<string, unknown>> {
  from: S;
  to: S;
  /** Guard: return false to block the transition */
  guard?: (ctx: C) => boolean;
  /** Side effect executed during transition */
  effect?: (ctx: C) => void;
}

export interface WorkflowConfig<S extends string, C extends Record<string, unknown>> {
  steps: WorkflowStep<S, C>[];
  transitions: WorkflowTransition<S, C>[];
  initialStep: S;
  /** Called when workflow completes (reaches terminal state) */
  onComplete: (ctx: C) => void | Promise<void>;
}

export interface WorkflowState<S extends string, C extends Record<string, unknown>> {
  currentStep: S;
  ctx: C;
  completedSteps: S[];
  isComplete: boolean;
  validationError: string | null;
}
