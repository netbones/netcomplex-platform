import { pgEnum } from 'drizzle-orm/pg-core';

export const endpointTypeEnum = pgEnum('EndpointType', [
  'INTERNAL_CHAT',
  'EMAIL',
  'WEBFORM',
  'API',
  'SMS',
  'WHATSAPP',
  'PUSH',
]);
