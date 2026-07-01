import { relations } from 'drizzle-orm';
import { supports } from './supports';
import { users } from './users';

export const supportsRelations = relations(supports, (helpers) => ({ sender: helpers.one(users, { relationName: 'SentSupports', fields: [ supports.senderUserId ], references: [ users.id ] }), recipient: helpers.one(users, { relationName: 'ReceivedSupports', fields: [ supports.recipientUserId ], references: [ users.id ] }) }));