// Server-only public API barrel for @entities/education.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/education).
//
// See ADR-020 and docs/advisories/ADVISORY-008.md for rationale.

export {
  listBursaryFields,
  getBursaryField,
  createBursaryField,
  updateBursaryField,
  softDeleteBursaryField,
  listBursaries,
  getBursary,
  createBursary,
  updateBursary,
  softDeleteBursary,
} from './services';

export { canManageEducation, canCreateBursary, canPublishBursary } from './permissions';
