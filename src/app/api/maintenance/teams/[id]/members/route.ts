import {
  apiCreated,
  apiError,
  apiSuccess,
  db,
  maintenanceTeamMembers,
  maintenanceTeams,
  notDeleted,
  now,
  requireAnyPermission,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;
export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance/teams/[id]/members — List team members with user info
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: teamId } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const team = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, teamId),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      )
      .limit(1);

    if (team.length === 0) {
      return apiError('NOT_FOUND', 'Team not found', 404);
    }

    const members = await db
      .select({
        id: maintenanceTeamMembers.id,
        userId: maintenanceTeamMembers.userId,
        createdAt: maintenanceTeamMembers.createdAt,
      })
      .from(maintenanceTeamMembers)
      .where(eq(maintenanceTeamMembers.teamId, teamId));

    return apiSuccess(members);
  }
);

/**
 * POST /api/maintenance/teams/[id]/members — Add a user to the team
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: teamId } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const team = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, teamId),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      )
      .limit(1);

    if (team.length === 0) {
      return apiError('NOT_FOUND', 'Team not found', 404);
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return apiError('VALIDATION_ERROR', 'userId is required', 400);
    }

    const existing = await db
      .select()
      .from(maintenanceTeamMembers)
      .where(
        and(eq(maintenanceTeamMembers.teamId, teamId), eq(maintenanceTeamMembers.userId, userId))
      )
      .limit(1);

    if (existing.length > 0) {
      return apiError('CONFLICT', 'User is already a member of this team', 409);
    }

    const member = await db
      .insert(maintenanceTeamMembers)
      .values({
        id: createId(),
        tenantId,
        teamId,
        userId,
        createdAt: now(),
      })
      .returning();

    return apiCreated(member[0]);
  }
);

/**
 * DELETE /api/maintenance/teams/[id]/members — Remove a user from the team
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: teamId } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return apiError('VALIDATION_ERROR', 'userId query parameter is required', 400);
    }

    const team = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, teamId),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      )
      .limit(1);

    if (team.length === 0) {
      return apiError('NOT_FOUND', 'Team not found', 404);
    }

    await db
      .delete(maintenanceTeamMembers)
      .where(
        and(eq(maintenanceTeamMembers.teamId, teamId), eq(maintenanceTeamMembers.userId, userId))
      );

    return apiSuccess({ removed: true });
  }
);
