import { relations } from 'drizzle-orm';
import { taxJurisdictions } from './tax-jurisdictions';
import { taxRates } from './tax-rates';

export const taxJurisdictionsRelations = relations(taxJurisdictions, (helpers) => ({ taxRates: helpers.many(taxRates, { relationName: 'TaxJurisdictionToTaxRate' }) }));