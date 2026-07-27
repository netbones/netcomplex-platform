import { pgEnum } from 'drizzle-orm/pg-core';

export const credentialTypeEnum = pgEnum('CredentialType', [
  'EMAIL',
  'PASSKEY',
  'NOSTR',
  'LNURL',
  'OIDC',
]);
