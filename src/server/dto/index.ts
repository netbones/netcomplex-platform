// ── Full shim: re-export all DTOs from shared/api/dto (ADR-024 Phase 4) ──
// Once all router imports are repointed directly to @/shared/api/dto,
// this directory (src/server/dto/) can be deleted.
// See soralia-village-6jl9 for tracking.
export * from '@/shared/api/dto';
