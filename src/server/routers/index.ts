import { router } from '@api/server';

import { identityRouter } from './identity';
import { competitionRouter } from './competitions';
import { contentRouter } from './content';
import { notificationsRouter } from './notifications';
import { resourcesRouter } from './resources';
import { maintenanceRouter } from './maintenance';
import { chatRouter } from './chat';

// Domain routers are added here as they migrate to tRPC
export const appRouter = router({
  identity: identityRouter,
  competitions: competitionRouter,
  content: contentRouter,
  notifications: notificationsRouter,
  resources: resourcesRouter,
  maintenance: maintenanceRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
