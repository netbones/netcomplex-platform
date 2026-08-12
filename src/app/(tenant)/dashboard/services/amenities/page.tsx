import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AmenitiesRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      qs.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  }
  const q = qs.toString();
  redirect(`/amenities${q ? `?${q}` : ''}`);
}
