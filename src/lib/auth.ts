export async function checkUserAccess(userId: string) {
  const { prisma } = await import('@/lib/prisma');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, residentType: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (!user.isActive) {
    return { allowed: false, reason: 'Account is inactive' };
  }

  if (user.residentType === 'SUSPENDED') {
    return { allowed: false, reason: 'Account is suspended due to non-payment or violation' };
  }

  return { allowed: true };
}
