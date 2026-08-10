import { describe, it, expect } from 'vitest';
import {
  MAINTENANCE_STATUS_MESSAGES,
  MAINTENANCE_STATUS_SUBJECTS,
  maintenanceStatusMessage,
  maintenanceStatusSubject,
} from '@entities/maintenance/server';

const REQUEST_STATUS_VALUES = [
  'SUBMITTED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
] as const;

describe('maintenance status message maps', () => {
  it('covers every RequestStatus enum value', () => {
    for (const status of REQUEST_STATUS_VALUES) {
      expect(MAINTENANCE_STATUS_MESSAGES[status]).toBeTypeOf('string');
      expect(MAINTENANCE_STATUS_MESSAGES[status]!.length).toBeGreaterThan(0);
      expect(MAINTENANCE_STATUS_SUBJECTS[status]).toBeTypeOf('string');
      expect(MAINTENANCE_STATUS_SUBJECTS[status]!.length).toBeGreaterThan(0);
    }
  });

  it('maintenanceStatusMessage returns the mapped message for known statuses', () => {
    expect(maintenanceStatusMessage('COMPLETED')).toBe(
      'Your maintenance request has been completed.'
    );
  });

  it('maintenanceStatusMessage falls back for unknown statuses', () => {
    expect(maintenanceStatusMessage('UNKNOWN')).toBe(
      'Your maintenance request status has been updated to UNKNOWN.'
    );
  });

  it('maintenanceStatusSubject falls back for unknown statuses', () => {
    expect(maintenanceStatusSubject('UNKNOWN')).toBe('Maintenance Request Update');
  });
});
