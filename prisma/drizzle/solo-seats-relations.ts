import { relations } from 'drizzle-orm';
import { soloSeats } from './solo-seats';
import { households } from './households';
import { users } from './users';

export const soloSeatsRelations = relations(soloSeats, (helpers) => ({ household: helpers.one(households, { relationName: 'householdTosoloSeat', fields: [ soloSeats.householdId ], references: [ households.id ] }), user: helpers.one(users, { relationName: 'soloSeatTouser', fields: [ soloSeats.userId ], references: [ users.id ] }) }));