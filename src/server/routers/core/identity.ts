import { t } from '@api/server';
import { propertiesRouter } from './properties';
import { usersRouter } from './users';
import { householdsRouter } from './households';
import { myProfileRouter } from './myProfile';
import { profilesRouter } from './profiles';
import { soloSeatsRouter } from './soloSeats';
import { agentAccessRouter } from './agentAccess';
import { suspensionsRouter } from './suspensions';
import { albumsRouter } from './albums';
import { seatsRouter } from './seats';
import { dashboardStatsRouter } from './dashboardStats';
import { userBooksRouter } from './userBooks';

export const identityRouter = t.mergeRouters(
  propertiesRouter,
  usersRouter,
  householdsRouter,
  myProfileRouter,
  profilesRouter,
  soloSeatsRouter,
  agentAccessRouter,
  suspensionsRouter,
  albumsRouter,
  seatsRouter,
  dashboardStatsRouter,
  userBooksRouter
);
