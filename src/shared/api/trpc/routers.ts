import { identityRouter } from '@entities/identity';
import { router } from '@api/trpc/server';

export const appRouter = router({
  identity: identityRouter,
});

export type AppRouter = typeof appRouter;
