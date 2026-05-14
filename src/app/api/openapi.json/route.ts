// Manual OpenAPI 3.0 specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Soralia Village API',
    version: '1.0.0',
    description: 'Multi-tenant community management platform API',
    license: {
      name: 'Proprietary',
      url: 'https://soralia-village.com/license',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.soralia-village.com',
      description: 'API Server',
    },
  ],
  paths: {
    '/api/trpc/identity.listProperties': {
      get: {
        operationId: 'listProperties',
        summary: 'List all properties',
        tags: ['Properties'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'input',
            in: 'query',
            required: false,
            schema: {
              type: 'object',
              properties: {
                search: { type: 'string' },
                street: { type: 'string' },
                page: { type: 'number', minimum: 1, default: 1 },
                limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
              },
            },
          },
        ],
        responses: {
          200: {
            description: 'List of properties',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    properties: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Property' },
                    },
                    total: { type: 'number' },
                    page: { type: 'number' },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      Property: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          street: { type: 'string' },
          unit: { type: 'string' },
          platformAddress: { type: 'string' },
          homeImage: { type: 'string', nullable: true },
          ownerId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(openApiSpec);
}
