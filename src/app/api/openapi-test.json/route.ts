import { NextResponse } from 'next/server';
import { initTRPC } from '@trpc/server';
import { generateOpenApiDocument, OpenApiMeta } from 'trpc-openapi';
import { z } from 'zod';

export function GET() {
  try {
    const t = initTRPC.meta<OpenApiMeta>().create();

    const testRouter = t.router({
      test: t.procedure
        .meta({ openapi: { method: 'GET', path: '/test', tags: ['Test'] } })
        .input(z.object({ id: z.string() }))
        .output(z.object({ result: z.string() }))
        .query(() => ({ result: 'ok' })),
    });

    const doc = generateOpenApiDocument(testRouter, {
      title: 'Test API',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000',
    });

    return Response.json(doc);
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
