import { relations } from 'drizzle-orm';
import { competitions } from './competitions';
import { tenants } from './tenants';
import { competitionEntries } from './competition-entries';

export const competitionsRelations = relations(competitions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'CompetitionToTenant', fields: [ competitions.tenantId ], references: [ tenants.id ] }), entries: helpers.many(competitionEntries, { relationName: 'CompetitionToCompetitionEntry' }) }));