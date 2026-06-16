import { relations } from 'drizzle-orm';
import { competitions } from './competitions';
import { competitionEntries } from './competition-entries';

export const competitionsRelations = relations(competitions, (helpers) => ({ entries: helpers.many(competitionEntries, { relationName: 'CompetitionToCompetitionEntry' }) }));