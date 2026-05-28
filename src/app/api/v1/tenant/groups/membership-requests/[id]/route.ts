// Re-export from canonical route location
// This route exists to establish the /api/v1/tenant/ namespace.
// The implementation lives at the flat /api/{resource}/[id] path for now.
// During the tRPC migration (Phase B), these routes will become tRPC procedures instead.
export { PATCH, DELETE } from '@/app/api/groups/membership-requests/[id]/route';
