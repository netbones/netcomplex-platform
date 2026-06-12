import { redirect } from 'next/navigation';
import { auth, db, users } from '@api/server';

import { eq } from 'drizzle-orm';

export default async function ResidentPage() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Look up the user's profileSlug
  const [user] = await db
    .select({ profileSlug: users.profileSlug })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user?.profileSlug) {
    redirect(`/resident/${user.profileSlug}`);
  }

  redirect(`/resident/${session.user.id}`);
}
