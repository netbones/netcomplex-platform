import { generateOpenAPIDocument } from '@trpc/openapi';
import path from 'node:path';

let cachedDoc: Record<string, unknown> | null = null;
let docPromise: Promise<Record<string, unknown>> | null = null;

async function generate(): Promise<Record<string, unknown>> {
  const routerPath = path.resolve(process.cwd(), 'src/shared/api/trpc/routers.ts');

  const doc = await generateOpenAPIDocument(routerPath, {
    title: 'Netcomplex API',
    version: '1.0.0',
  });

  // Enhance with metadata that generateOpenAPIDocument doesn't support
  return {
    ...doc,
    info: {
      ...(doc.info as Record<string, unknown> | undefined),
      description: 'Multi-tenant community management platform API',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
  };
}

export async function generateOpenApiSpec(): Promise<Record<string, unknown>> {
  if (cachedDoc) return cachedDoc;
  if (!docPromise) {
    docPromise = generate().then(doc => {
      cachedDoc = doc;
      return doc;
    });
  }
  return docPromise;
}
