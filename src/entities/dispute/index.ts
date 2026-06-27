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
  intakeScreenOutputSchema,
} from './model/schemas';
export type {
  DisputeCreateInput,
  DisputeUpdateInput,
  DisputeMessageCreateInput,
  DisputeAssignInput,
  DisputeRulingInput,
  IntakeScreenOutput,
} from './model/schemas';

// UI components
export { DisputeStatusBadge } from './ui/DisputeStatusBadge';
export { DisputeCategoryBadge } from './ui/DisputeCategoryBadge';
export { SeverityIndicator } from './ui/SeverityIndicator';
export { DisputeListTable } from './ui/DisputeListTable';
export { DisputeTimeline } from './ui/DisputeTimeline';
export { MediationThread } from './ui/MediationThread';
export { MediationMessageBubble } from './ui/MediationMessageBubble';
export { AIFrivolityCheckPanel } from './ui/AIFrivolityCheckPanel';
export { CoolingOffTimer } from './ui/CoolingOffTimer';
export { EvidenceUploadZone } from './ui/EvidenceUploadZone';
export { EvidencePreviewGrid } from './ui/EvidencePreviewGrid';
export { DisputeActionsBar } from './ui/DisputeActionsBar';
export { CSOSExportButton } from './ui/CSOSExportButton';
