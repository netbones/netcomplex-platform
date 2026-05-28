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

  const docObj = doc as Record<string, unknown>;

  // Add security scheme for Better Auth bearer token
  const securitySchemes = {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Better Auth session token. Obtain via /api/auth/sign-in',
    },
  };

  // Apply security to all operations
  const security = [{ bearerAuth: [] }];

  // Augment each operation with security definition
  const paths = (docObj.paths as Record<string, unknown>) || {};
  for (const pathKey of Object.keys(paths)) {
    const path = paths[pathKey] as Record<string, unknown>;
    for (const method of Object.keys(path)) {
      const op = path[method] as Record<string, unknown>;
      if (op && typeof op === 'object') {
        op.security = security;
      }
    }
  }

  return {
    ...docObj,
    info: {
      ...(docObj.info as Record<string, unknown> | undefined),
      description: 'Multi-tenant community management platform API',
      license: { name: 'Proprietary', url: 'https://netcomplex.io/license' },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      ...((docObj.components as Record<string, unknown>) || {}),
      securitySchemes,
    },
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

// CLI invocation: writes spec to a file
if (import.meta.url === `file://${process.argv[1]}`) {
  generateOpenApiSpec().then(async doc => {
    const { writeFileSync } = await import('node:fs');
    const outputPath = process.argv[2] || 'public/openapi.json';
    writeFileSync(outputPath, JSON.stringify(doc, null, 2));
    console.log(`OpenAPI spec written to ${outputPath}`);
  });
}
