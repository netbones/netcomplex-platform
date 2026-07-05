// Server-only public API barrel for @features/support.
// Import from here in API routes and server components:
//   import { createSupport, SupportError } from '@features/support/server';
//
// Mirrors the @entities/<slice>/server pattern (ADR-020). The ESLint
// no-restricted-imports rule allows @features/<slice>/server as the
// canonical entry point for server-only feature exports.

export { supportTargetSchema, createSupportSchema } from './model/schema';
export type { SupportTarget, CreateSupportInput } from './model/schema';
export { createSupport, getSupportAggregate, SupportError } from './api/server';
export type { CreateSupportParams, SupportServiceResult } from './api/server';
