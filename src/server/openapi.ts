import { generateOpenApiDocument } from 'trpc-openapi';
import { identityOpenApiRouter } from '@entities/identity/api/openapi-router';

export const openApiDocument = generateOpenApiDocument(identityOpenApiRouter, {
  title: 'Soralia Village API',
  version: '1.0.0',
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  docsUrl: 'https://api.soralia-village.com/docs',
  tags: ['Tenants', 'Content', 'Users', 'Invitations', 'Media', 'Platform'],
});
