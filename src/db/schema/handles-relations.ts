import { relations } from 'drizzle-orm';
import { handles } from './handles';
import { addresses } from './addresses';

export const handlesRelations = relations(handles, helpers => ({
  address: helpers.one(addresses, {
    relationName: 'AddressToHandle',
    fields: [handles.addressId],
    references: [addresses.id],
  }),
}));
