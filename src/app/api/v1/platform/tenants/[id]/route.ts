// Re-export from canonical route location
// This route exists to establish the /api/v1/platform/ namespace.
// The implementation lives at the flat /api/tenants/[id] path for now.
// During the tRPC migration (Phase B), these routes will become tRPC procedures instead.
export { GET, PATCH, DELETE } from '@/app/api/tenants/[id]/route';
