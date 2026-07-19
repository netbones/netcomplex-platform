import { router } from '@api/server';
import { adminBillingRouter } from './billing';
import { adminActivityRouter } from './activity';

export const adminRouter = router({
  billing: adminBillingRouter,
  activity: adminActivityRouter,
});
