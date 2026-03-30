import { identityRouter } from './routers/identity';
import { router } from '@/lib/trpc/server';

export const appRouter = router({
  identity: identityRouter,
});

export type AppRouter = typeof appRouter;
