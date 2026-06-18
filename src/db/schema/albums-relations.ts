import { relations } from 'drizzle-orm';
import { albums } from './albums';
import { users } from './users';

export const albumsRelations = relations(albums, helpers => ({
  user: helpers.one(users, {
    relationName: 'AlbumTouser',
    fields: [albums.userId],
    references: [users.id],
  }),
}));
