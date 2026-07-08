import { router } from '@api/server';

import { identityRouter } from './identity';
import { competitionRouter } from './competitions';
import { contentRouter } from './content';
import { notificationsRouter } from './notifications';
import { resourcesRouter } from './resources';
import { maintenanceRouter } from './maintenance';
import { chatRouter } from './chat';
import { surveysRouter } from './surveys';
import { eventsRouter } from './events';
import { bookingsRouter } from './bookings';
import { disputesRouter } from './disputes';
import { dwalletRouter } from './dwallet';
import { marketplaceRouter } from './marketplace';
import { groupsRouter } from './groups';
import { meritsRouter } from './merits';
import { settingsRouter } from './settings';
import { achievementsRouter } from './achievements';
import { invitationsRouter } from './invitations';
import { agentsRouter } from './agents';
import { delegationsRouter } from './delegations';
import { educationRouter } from './education';
import { householdsRouter } from './households';
import { providersRouter } from './providers';

// Domain routers are added here as they migrate to tRPC
export const appRouter = router({
  identity: identityRouter,
  competitions: competitionRouter,
  content: contentRouter,
  notifications: notificationsRouter,
  resources: resourcesRouter,
  maintenance: maintenanceRouter,
  chat: chatRouter,
  surveys: surveysRouter,
  events: eventsRouter,
  bookings: bookingsRouter,
  disputes: disputesRouter,
  dwallet: dwalletRouter,
  marketplace: marketplaceRouter,
  groups: groupsRouter,
  merits: meritsRouter,
  settings: settingsRouter,
  achievements: achievementsRouter,
  invitations: invitationsRouter,
  agents: agentsRouter,
  delegations: delegationsRouter,
  education: educationRouter,
  households: householdsRouter,
  providers: providersRouter,
});

export type AppRouter = typeof appRouter;
