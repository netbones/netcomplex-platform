import {
  db,
  invitations,
  tenants,
  users,
  apiCreated,
  apiError,
  apiSuccess,
  rateLimitByIP,
  sendEmail,
  templates,
} from '@api/server';

import { eq, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { apiLogger } from '@shared/lib';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export async function GET() {
  const { tenantId } = await withTenant();
  const invitationList = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tenantId, tenantId))
    .orderBy(desc(invitations.createdAt));
  return apiSuccess(invitationList);
}

export async function POST(request: Request) {
  // Rate limit: 5 invitations per minute per IP
  const rateLimit = rateLimitByIP(request, { windowMs: 60_000, maxRequests: 5 });
  if (rateLimit) return rateLimit;

  const body = await request.json();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // For now, use a placeholder - in production this would come from the authenticated user
  const inviterId = body.inviterId || 'placeholder-user-id';

  // Get tenant name for email
  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  // Get inviter name for email
  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, inviterId))
    .limit(1);

  const token = crypto.randomUUID();
  const acceptUrl = `${BETTER_AUTH_URL}/invite/${token}`;

  const [invitation] = await db
    .insert(invitations)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      email: body.email,
      name: body.name,
      role: body.role ?? 'RESIDENT',
      residentType: body.residentType ?? 'OWNER',
      inviterId,
      organizationId: body.organizationId || 'placeholder-org-id',
      token,
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .returning();

  // Send invitation email (non-blocking)
  void sendEmail({
    to: body.email,
    subject: templates.teamInvitation.subject,
    html: templates.teamInvitation.getHtml(
      body.name,
      inviter?.name || 'A community member',
      tenant?.name || 'Soralia Village',
      acceptUrl,
      body.role ?? 'RESIDENT'
    ),
  }).catch(error => {
    apiLogger.error({ invitationId: invitation.id, error }, 'Failed to send invitation email');
  });

  return apiCreated(invitation);
}
