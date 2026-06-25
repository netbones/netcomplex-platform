export const runtime = 'edge';

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime: 'edge',
      version: process.env.npm_package_version ?? '0.0.0',
    }),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
