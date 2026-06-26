// Client-safe dispute entity barrel.
// Re-exports types, constants, lifecycle, and UI components.
// Does NOT export any server-only code.

export * from './model/types';
export * from './model/constants';
export * from './model/lifecycle';
export {
  disputeCreateSchema,
  disputeUpdateSchema,
  disputeMessageCreateSchema,
  disputeAssignSchema,
  disputeRulingSchema,
} from './model/schemas';

// UI components (created in Task 2)
export { DisputeStatusBadge } from './ui/DisputeStatusBadge';
export { DisputeCategoryBadge } from './ui/DisputeCategoryBadge';
export { SeverityIndicator } from './ui/SeverityIndicator';
