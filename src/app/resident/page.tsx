import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function ResidentPage() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  redirect(`/resident/${session.user.id}`);
}
