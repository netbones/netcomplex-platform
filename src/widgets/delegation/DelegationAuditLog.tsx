'use client';

import { useDelegationAudit } from '@entities/delegation';

const actionLabels: Record<string, string> = {
  created: 'Delegation created',
  accepted: 'Accepted',
  rejected: 'Declined',
  revoked: 'Revoked',
  expired: 'Expired',
  scope_modified: 'Scope modified',
  token_issued: 'Access token issued',
  blocked: 'Contact blocked',
  unblocked: 'Contact unblocked',
};

const actionColors: Record<string, string> = {
  created: 'bg-blue-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  revoked: 'bg-red-500',
  expired: 'bg-gray-400',
  scope_modified: 'bg-amber-500',
  token_issued: 'bg-purple-500',
  blocked: 'bg-orange-500',
  unblocked: 'bg-teal-500',
};

export function DelegationAuditLog({ delegationId }: { delegationId: string }) {
  const { data: entries, isLoading, error } = useDelegationAudit(delegationId);

  if (isLoading) {
    return <div className="h-8 animate-pulse rounded bg-muted" />;
  }

  if (error || !entries) {
    return <p className="text-xs text-muted-foreground">Unable to load activity log.</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity recorded.</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-2 top-0 h-full w-px bg-border" />

      <ul className="space-y-2">
        {entries.map(entry => (
          <li key={entry.id} className="relative flex items-start gap-3 pl-6">
            {/* Timeline dot */}
            <div
              className={`absolute left-[0.3rem] top-1.5 h-2 w-2 rounded-full ${actionColors[entry.action] ?? 'bg-gray-400'}`}
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs">
                <span className="font-medium">{actionLabels[entry.action] ?? entry.action}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              {entry.metadata && (
                <details className="mt-0.5">
                  <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                    Details
                  </summary>
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-1 text-[10px]">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
