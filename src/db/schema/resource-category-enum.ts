import { pgEnum } from 'drizzle-orm/pg-core';

export const resourceCategoryEnum = pgEnum('ResourceCategory', [
  'ARCHITECTURAL',
  'ENGINEERING',
  'GOVERNANCE',
  'BOARD_REPORT',
  'DIY',
  'FINANCIAL',
  'LEGAL',
  'EDUCATION',
  'OTHER',
]);
