// Re-export from canonical route location
// This route exists to establish the /api/v1/system/ namespace.
// The implementation lives at the flat /api/{resource} path for now.
export { GET } from '@/app/api/flags/route';
