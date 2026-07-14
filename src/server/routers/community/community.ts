import { router } from '@api/server';
import { eventsRouter } from './events';
import { groupsRouter } from './groups';
import { competitionsRouter } from './competitions';
import { meritsRouter } from './merits';
import { achievementsRouter } from './achievements';
import { notificationsRouter } from './notifications';
import { chatRouter } from './chat';

export const communityRouter = router({
  events: eventsRouter,
  groups: groupsRouter,
  competitions: competitionsRouter,
  merits: meritsRouter,
  achievements: achievementsRouter,
  notifications: notificationsRouter,
  chat: chatRouter,
});
