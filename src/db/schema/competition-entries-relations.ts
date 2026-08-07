import { relations } from 'drizzle-orm';
import { competitionEntries } from './competition-entries';
import { competitions } from './competitions';
import { users } from './users';

export const competitionEntriesRelations = relations(competitionEntries, helpers => ({
  competition: helpers.one(competitions, {
    relationName: 'CompetitionToCompetitionEntry',
    fields: [competitionEntries.competitionId],
    references: [competitions.id],
  }),
  user: helpers.one(users, {
    relationName: 'CompetitionEntryTouser',
    fields: [competitionEntries.userId],
    references: [users.id],
  }),
}));
