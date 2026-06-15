// Server-only public API barrel for @entities/event.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/event).
//
// See ADR-020 and docs/advisories/ADVISORY-008.md for rationale.

export { listEvents, validateEventFields, createEvent } from './services';
