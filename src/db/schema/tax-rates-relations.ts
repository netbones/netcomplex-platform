import { relations } from 'drizzle-orm';
import { taxRates } from './tax-rates';
import { taxJurisdictions } from './tax-jurisdictions';

export const taxRatesRelations = relations(taxRates, helpers => ({
  jurisdiction: helpers.one(taxJurisdictions, {
    relationName: 'TaxJurisdictionToTaxRate',
    fields: [taxRates.jurisdictionId],
    references: [taxJurisdictions.id],
  }),
}));
