// Re-export from canonical route location
// This route exists to establish the /api/v1/tenant/ namespace.
// The implementation lives at the flat /api/{resource}/[key] path for now.
// During the tRPC migration (Phase B), these routes will become tRPC procedures instead.
export { GET, POST } from '@/app/api/settings/[key]/route';
