import { pgEnum } from 'drizzle-orm/pg-core';

export const aiOveragePolicyEnum = pgEnum('AiOveragePolicy', [
  'HARD_STOP',
  'THROTTLE',
  'SURCHARGE',
]);
