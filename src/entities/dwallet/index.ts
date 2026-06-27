// Zod validation schemas
export {
  consentSchema,
  payoutRequestSchema,
  exportRequestSchema,
  batchSchema,
  payoutStatusSchema,
  streamConfigSchema,
  streamUpdateSchema,
} from './schema';
export type {
  ConsentInput,
  PayoutRequestInput,
  ExportRequestInput,
  BatchInput,
  PayoutStatusInput,
  StreamConfigInput,
  StreamUpdateInput,
} from './schema';

// TypeScript interfaces
export type {
  DWalletSummary,
  ConsentState,
  TransactionItem,
  PayoutRequestItem,
  StreamConfig,
  AdminStats,
  BatchRecord,
  TransactionType,
  TransactionSource,
  PayoutStatus,
  BatchStatus,
  WalletStatus,
} from './model/types';

// Server-side helpers — NOT exported from client barrel.
// Import via @entities/dwallet/server instead:
//   @entities/dwallet/server

// Client-side hooks
export { useWallet } from './model/useWallet';
