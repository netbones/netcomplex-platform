// Server-only public API barrel for @entities/dwallet.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/dwallet).

export { getOrCreateWallet } from './api';
