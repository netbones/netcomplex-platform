import { router } from '@api/server';

import { identityRouter } from './core/identity';
import { householdsRouter } from './core/households';
import { invitationsRouter } from './core/invitations';
import { delegationsRouter } from './core/delegations';
import { settingsRouter } from './core/settings';
import { platformRouter } from './core/platform';
import { contentRouter } from './core/content';
import { resourcesRouter } from './core/resources';
import { mediaRouter } from './core/media';
import { servicesRouter } from './core/services';

import { eventsRouter } from './community/events';
import { groupsRouter } from './community/groups';
import { competitionsRouter } from './community/competitions';
import { meritsRouter } from './community/merits';
import { achievementsRouter } from './community/achievements';
import { notificationsRouter } from './community/notifications';
import { chatRouter } from './community/chat';
import { proxyVoteRouter } from './community/proxy-vote';

import { maintenanceRouter } from './operations/maintenance';
import { bookingsRouter } from './operations/bookings';
import { surveysRouter } from './operations/surveys';
import { disputesRouter } from './operations/disputes';
import { providersRouter } from './operations/providers';
import { commentsRouter } from './operations/comments';

import { marketplaceRouter as marketplaceRouterNested } from './marketplace/marketplace';
import { dwalletRouter } from './marketplace/dwallet';
import { agentsRouter } from './marketplace/agents';

import { educationRouter } from './education/education';
import { adminRouter } from './admin';

export const appRouter = router({
  identity: identityRouter,
  households: householdsRouter,
  invitations: invitationsRouter,
  delegations: delegationsRouter,
  settings: settingsRouter,
  platform: platformRouter,
  content: contentRouter,
  resources: resourcesRouter,
  media: mediaRouter,
  services: servicesRouter,
  events: eventsRouter,
  groups: groupsRouter,
  competitions: competitionsRouter,
  merits: meritsRouter,
  achievements: achievementsRouter,
  notifications: notificationsRouter,
  chat: chatRouter,
  proxyVote: proxyVoteRouter,
  maintenance: maintenanceRouter,
  bookings: bookingsRouter,
  surveys: surveysRouter,
  disputes: disputesRouter,
  providers: providersRouter,
  comments: commentsRouter,
  marketplace: marketplaceRouterNested,
  dwallet: dwalletRouter,
  agents: agentsRouter,
  education: educationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
