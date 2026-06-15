import { pgEnum } from 'drizzle-orm/pg-core';

export const contentLicenseEnum = pgEnum('ContentLicense', [
  'CC0',
  'CC_BY',
  'CC_BY_SA',
  'CC_BY_NC',
  'ALL_RIGHTS_RESERVED',
]);
