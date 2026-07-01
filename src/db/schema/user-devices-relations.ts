import { relations } from 'drizzle-orm';
import { userDevices } from './user-devices';
import { users } from './users';

export const userDevicesRelations = relations(userDevices, (helpers) => ({ user: helpers.one(users, { relationName: 'UserDeviceTouser', fields: [ userDevices.userId ], references: [ users.id ] }) }));