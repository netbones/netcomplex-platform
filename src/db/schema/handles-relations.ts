import { relations } from 'drizzle-orm';
import { handles } from './handles';
import { tenants } from './tenants';
import { addresses } from './addresses';

export const handlesRelations = relations(handles, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'HandleToTenant',
    fields: [handles.tenantId],
    references: [tenants.id],
  }),
  address: helpers.one(addresses, {
    relationName: 'AddressToHandle',
    fields: [handles.addressId],
    references: [addresses.id],
  }),
}));
