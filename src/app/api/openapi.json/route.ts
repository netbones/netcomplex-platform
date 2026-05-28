import { generateOpenApiSpec } from '@server/openapi/generator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const spec = await generateOpenApiSpec();
  return Response.json(spec);
}
