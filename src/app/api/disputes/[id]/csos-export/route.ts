// STUB — RED phase. Tests will fail until GREEN implementation is written.
export const GET = async (_request: Request, _ctx: { params: Promise<{ id: string }> }) => {
  return new Response(JSON.stringify({ error: 'not implemented' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
};
