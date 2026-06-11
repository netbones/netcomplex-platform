import { router } from '@api/server';

import { identityRouter } from './identity';
import { competitionRouter } from './competitions';

// Domain routers are added here as they migrate to tRPC
export const appRouter = router({
  identity: identityRouter,
  competitions: competitionRouter,
});

export type AppRouter = typeof appRouter;
