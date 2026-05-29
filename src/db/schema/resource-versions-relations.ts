import { relations } from 'drizzle-orm';
import { resourceVersions } from './resource-versions';
import { resources } from './resources';

export const resourceVersionsRelations = relations(resourceVersions, (helpers) => ({ resource: helpers.one(resources, { relationName: 'ResourceToResourceVersion', fields: [ resourceVersions.resourceId ], references: [ resources.id ] }) }));