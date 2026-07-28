export const TIER_BADGE: Record<string, string> = {
  PREMIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  ENTERPRISE: 'bg-purple-100 text-purple-700 border-purple-200',
  STANDARD: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const SUBSCRIPTION_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  TRIALING: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAST_DUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  VOID: 'bg-gray-100 text-gray-500',
};
