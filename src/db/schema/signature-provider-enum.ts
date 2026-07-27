import { pgEnum } from 'drizzle-orm/pg-core';

export const signatureProviderEnum = pgEnum('SignatureProvider', [
  'INTERNAL',
  'DOCUSIGN',
  'ADOBE_SIGN',
  'PGP',
  'GOV_EID',
]);
