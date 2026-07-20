import { router } from '@api/server';
import { adminBillingRouter } from './billing';
import { adminActivityRouter } from './activity';
import { adminAgentsRouter } from './agents';

export const adminRouter = router({
  billing: adminBillingRouter,
  activity: adminActivityRouter,
  agents: adminAgentsRouter,
});
