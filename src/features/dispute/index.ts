// Public API barrel for the dispute feature slice.
// Exports components and hooks that other FSD layers may consume.
// Internal implementation details (wizard stages, intake hook internals) are NOT exported.

// UI components (public)
export { DisputeIntakeWizard } from './ui/intake/DisputeIntakeWizard';
export { DisputeForm } from './ui/DisputeForm';

// Hooks (public)
export { useDisputeThread } from './model/useDisputeThread';
export { useDisputeActions } from './model/useDisputeActions';
export type { DisputeAction } from './model/useDisputeActions';
