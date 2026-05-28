import { router } from '@api/trpc/server';
import { identityRouter } from './identity';

// Domain routers are added here as they migrate to tRPC
export const appRouter = router({
  identity: identityRouter,
});

export type AppRouter = typeof appRouter;
