// STUB — RED phase. Tests will fail until GREEN implementation is written.
export async function POST(_request: Request) {
  return new Response(JSON.stringify({ error: 'not implemented' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
