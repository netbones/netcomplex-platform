import { relations } from 'drizzle-orm';
import { behaviorRecords } from './behavior-records';
import { users } from './users';

export const behaviorRecordsRelations = relations(behaviorRecords, helpers => ({
  user: helpers.one(users, {
    relationName: 'BehaviorRecordSubject',
    fields: [behaviorRecords.userId],
    references: [users.id],
  }),
  createdBy: helpers.one(users, {
    relationName: 'BehaviorRecordCreatedBy',
    fields: [behaviorRecords.createdById],
    references: [users.id],
  }),
  resolvedBy: helpers.one(users, {
    relationName: 'BehaviorRecordResolvedBy',
    fields: [behaviorRecords.resolvedById],
    references: [users.id],
  }),
}));
