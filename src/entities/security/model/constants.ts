import type { SecurityContactType } from './types';

export const SECURITY_CONTACT_TYPE_OPTIONS: {
  value: SecurityContactType;
  label: string;
}[] = [
  { value: 'INTERNAL_SECURITY', label: 'Internal security' },
  { value: 'ARMED_RESPONSE', label: 'Armed response' },
  { value: 'EMERGENCY_SERVICES', label: 'Emergency services' },
];

export const EMERGENCY_DIAL_NUMBER = '10111';

export const SECURITY_HOLD_CONFIRM_MS = 3000;

export const SECURITY_DISCLAIMER_PLACEHOLDER =
  '[PENDING LEGAL SIGN-OFF] Security services are subject to community boundary and provider coverage. See full disclaimer.';
