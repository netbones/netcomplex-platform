/**
 * Standardized toast messages for consistent UX.
 *
 * All messages follow:
 *   Success — "{Entity} created/updated/deleted"
 *   Error   — "Failed to {action} {entity}"
 */

export const ToastMsg = {
  created: (entity: string) => `${entity} created`,
  updated: (entity: string) => `${entity} updated`,
  deleted: (entity: string) => `${entity} deleted`,
  failedToCreate: (entity: string) => `Failed to create ${entity.toLowerCase()}`,
  failedToUpdate: (entity: string) => `Failed to update ${entity.toLowerCase()}`,
  failedToDelete: (entity: string) => `Failed to delete ${entity.toLowerCase()}`,
  failedToSave: (entity: string) => `Failed to save ${entity.toLowerCase()}`,
  failedToLoad: (entity: string) => `Failed to load ${entity.toLowerCase()}`,
  failedToUpload: (entity: string) => `Failed to upload ${entity.toLowerCase()}`,
  uploaded: (entity: string) => `${entity} uploaded`,
  genericError: 'Something went wrong',
};
