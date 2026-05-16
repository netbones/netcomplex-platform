/**
 * Migration script: Content RESOURCE -> Resource model
 *
 * Converts all Content records with category=RESOURCE into the new Resource model.
 * Original Content records are NOT deleted — left for manual verification.
 *
 * Usage: npx tsx src/lib/migrations/migrate-resources.ts
 */

import { db, contents, resources } from '@api/db';
import { eq } from 'drizzle-orm';

interface ContentRecord {
  id: string;
  tenantId: string;
  title: Record<string, string>;
  content: Record<string, string>;
  excerpt: Record<string, string> | null;
  category: string;
  authorId: string | null;
  published: boolean;
  publishedAt: Date | null;
  defaultLocale: string;
}

/**
 * Extract a string value from a JSON locale object.
 * Tries the 'en' locale first, then falls back to the first available value.
 */
function extractLocaleValue(
  jsonValue: Record<string, string> | null | undefined,
  locale = 'en'
): string {
  if (!jsonValue || typeof jsonValue !== 'object') return '';
  if (jsonValue[locale]) return jsonValue[locale];
  const firstKey = Object.keys(jsonValue)[0];
  return firstKey ? jsonValue[firstKey] : '';
}

export async function migrateResources(): Promise<{
  totalFound: number;
  totalMigrated: number;
  errors: Array<{ contentId: string; error: string }>;
}> {
  console.log('=== Content RESOURCE -> Resource Migration ===\n');

  const result = {
    totalFound: 0,
    totalMigrated: 0,
    errors: [] as Array<{ contentId: string; error: string }>,
  };

  // Step 1: Query all Content records with category = 'RESOURCES'
  console.log('Step 1: Querying Content records with category=RESOURCES...');

  const contentRecords = (await db
    .select()
    .from(contents)
    .where(eq(contents.category, 'RESOURCES' as never))) as ContentRecord[];

  result.totalFound = contentRecords.length;
  console.log(`  Found ${result.totalFound} Content RESOURCE records.\n`);

  if (result.totalFound === 0) {
    console.log('No records to migrate. Exiting.');
    return result;
  }

  // Step 2: Migrate each record within a transaction
  console.log('Step 2: Migrating records to Resource model...');

  try {
    await db.transaction(async tx => {
      for (const content of contentRecords) {
        try {
          const title = extractLocaleValue(content.title, content.defaultLocale);
          const description = extractLocaleValue(content.excerpt, content.defaultLocale);
          const bodyContent = content.content || null;

          if (!title) {
            result.errors.push({
              contentId: content.id,
              error: 'No title found in any locale',
            });
            console.log(`  SKIP [${content.id}]: No title found`);
            continue;
          }

          const now = new Date();

          const [newResource] = await tx
            .insert(resources)
            .values({
              id: crypto.randomUUID(),
              tenantId: content.tenantId,
              title,
              description: description || null,
              category: 'OTHER',
              bodyContent: bodyContent,
              authorId: content.authorId,
              publishedAt: content.published ? content.publishedAt : null,
              visibility: 'ALL_RESIDENTS',
              createdAt: now,
              updatedAt: now,
            })
            .returning({ id: resources.id });

          result.totalMigrated++;
          console.log(
            `  MIGRATED [${content.id}] -> [${newResource.id}]: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          result.errors.push({ contentId: content.id, error: errorMsg });
          console.log(`  ERROR [${content.id}]: ${errorMsg}`);
        }
      }
    });
  } catch (err) {
    console.error('\nTransaction failed! All changes rolled back.');
    console.error('Error:', err instanceof Error ? err.message : String(err));
    throw err;
  }

  // Step 3: Output summary
  console.log('\n=== Migration Summary ===');
  console.log(`Total Content RESOURCE records found: ${result.totalFound}`);
  console.log(`Total Resource records created:     ${result.totalMigrated}`);
  console.log(`Errors encountered:                 ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of result.errors) {
      console.log(`  - Content ${err.contentId}: ${err.error}`);
    }
  }

  console.log('\nNOTE: Original Content records were NOT deleted.');
  console.log('Verify migrated data before manually removing old Content records.\n');

  return result;
}

// Run if executed directly
if (process.argv[1] && process.argv[1].includes('migrate-resources')) {
  migrateResources()
    .then(result => {
      if (result.errors.length > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
