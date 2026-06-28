'use client';

import { useState } from 'react';
import { useDelegations, useBlockDelegation } from '@entities/delegation';
import { SCOPE_LABELS } from '@entities/delegation';
import { useSession } from '@api/client';
import { DelegationAuditLog } from './DelegationAuditLog';
import type { DelegationListItem } from '@entities/delegation';

/**
 * DelegationWidget — Resident-facing dashboard widget showing active delegations
 * on their properties with per-agent block toggles.
 *
 * Follows dWallet UX pattern (Phase 47): toggle + append-only audit + Pino log.
 *
 * Usage:
 *   <DelegationWidget />  // renders full delegation dashboard
 *
 * The widget is also consumable as a standalone embeddable:
 *   import { DelegationWidget } from '@widgets/delegation';
 */
export function DelegationWidget() {
  const { data: sessionData } = useSession();
  const { data: delegations, isLoading, error } = useDelegations();
  const blockMutation = useBlockDelegation();
  const [expandedDelegationId, setExpandedDelegationId] = useState<string | null>(null);

  if (!sessionData?.user?.id) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Sign in to view property delegations.</div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load delegations. Please try again.
      </div>
    );
  }

  const activeDelegations = (delegations ?? []).filter(d => d.status === 'ACTIVE');
  const pendingDelegations = (delegations ?? []).filter(d => d.status === 'PENDING');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Property Delegations</h2>
        {pendingDelegations.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {pendingDelegations.length} pending
          </span>
        )}
      </div>

      {activeDelegations.length === 0 && pendingDelegations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active delegations on your properties.</p>
      ) : (
        <div className="space-y-2">
          {activeDelegations.map(delegation => (
            <DelegationCard
              key={delegation.id}
              delegation={delegation}
              isBlocked={
                delegation.blocked ??
                !delegation.permissions.includes('communication:contact_occupant')
              }
              onToggleBlock={blocked =>
                blockMutation.mutate({ delegationId: delegation.id, blocked })
              }
              isExpanded={expandedDelegationId === delegation.id}
              onToggleExpand={() =>
                setExpandedDelegationId(
                  expandedDelegationId === delegation.id ? null : delegation.id
                )
              }
            />
          ))}
        </div>
      )}

      {pendingDelegations.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground">Pending Delegations</h3>
          <div className="space-y-2">
            {pendingDelegations.map(delegation => (
              <PendingDelegationCard key={delegation.id} delegation={delegation} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface DelegationCardProps {
  delegation: DelegationListItem;
  isBlocked: boolean;
  onToggleBlock: (blocked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function DelegationCard({
  delegation,
  isBlocked,
  onToggleBlock,
  isExpanded,
  onToggleExpand,
}: DelegationCardProps) {
  const scopeLabels = SCOPE_LABELS;

  const expiryDate = new Date(delegation.expiresAt);
  const isExpiringSoon = expiryDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{delegation.agentName ?? delegation.agentId}</p>
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              Agent
            </span>
            {isExpiringSoon && (
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                Expiring soon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {delegation.propertyAddress ?? delegation.propertyId}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(delegation.permissions ?? []).map(scope => (
              <span
                key={scope}
                className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                {scopeLabels[scope] ?? scope}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleBlock(!isBlocked)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              isBlocked ? 'bg-red-200' : 'bg-green-200'
            }`}
            aria-label={isBlocked ? 'Unblock agent contact' : 'Block agent contact'}
            title={isBlocked ? 'Agent cannot contact you' : 'Agent can contact you'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                isBlocked ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label="Show delegation history"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isExpanded ? 'rotate-180' : ''}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span>Expires {expiryDate.toLocaleDateString()}</span>
        <span>Granted by {delegation.grantedByName ?? 'Owner'}</span>
      </div>

      {isExpanded && (
        <div className="mt-3 border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Activity Log</h4>
          <DelegationAuditLog delegationId={delegation.id} />
        </div>
      )}
    </div>
  );
}

function PendingDelegationCard({ delegation }: { delegation: DelegationListItem }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{delegation.agentName ?? delegation.agentId}</p>
          <p className="text-xs text-muted-foreground">
            {delegation.propertyAddress ?? 'Unknown property'} — Awaiting acceptance
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Pending
        </span>
      </div>
    </div>
  );
}
