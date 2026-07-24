import { pgEnum } from 'drizzle-orm/pg-core';

export const signatureProviderEnum = pgEnum('SignatureProvider', ['INTERNAL', 'LIGHTNING', 'NOSTR', 'DOCUSIGN', 'ADOBE_SIGN', 'PASSKEY', 'PGP', 'GOV_EID']);