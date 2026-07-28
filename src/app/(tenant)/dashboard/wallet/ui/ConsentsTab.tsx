'use client';

import { useSafeTranslation } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { Info, Shield } from 'lucide-react';
import type { ConsentState } from '@entities/dwallet';
import { formatDate, getStreamLabelKey, getStreamDescKey } from '../model/helpers';
import { ConsentToggle } from './ConsentToggle';

export function ConsentsTab({
  consents,
  isLoading,
  isUpdating,
  onToggle,
}: {
  consents: ConsentState[];
  isLoading: boolean;
  isUpdating: boolean;
  onToggle: (streamKey: string, granted: boolean) => void;
}) {
  const { tx } = useSafeTranslation();
  if (isLoading) {
    return <LoadingSkeleton className="space-y-3" />;
  }

  const masterConsent = consents.find(c => c.streamKey === 'resident_data_share');
  const perStreamConsents = consents.filter(c => c.streamKey !== 'resident_data_share');

  return (
    <div>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        {masterConsent && (
          <div className="px-5">
            <ConsentToggle
              streamKey={masterConsent.streamKey}
              label={tx('dwallet.consentLabel', 'Resident Data Share Program')}
              granted={masterConsent.granted}
              isMaster
              subtitle={tx(
                'dwallet.consentSubtitle',
                'Share in platform revenue earned by the community. Your share = total pool ÷ all participants.'
              )}
              dateLine={
                masterConsent.granted && masterConsent.grantedAt
                  ? tx('dwallet.grantedOn', 'Granted {date}', {
                      date: formatDate(masterConsent.grantedAt),
                    })
                  : masterConsent.revokedAt
                    ? tx('dwallet.revokedPaused', 'Revoked {date} (paused)', {
                        date: formatDate(masterConsent.revokedAt),
                      })
                    : tx('dwallet.noConsentGranted', 'No consent granted')
              }
              onToggle={onToggle}
              isPending={isUpdating}
            />
          </div>
        )}

        <div className="px-5 pb-2">
          {perStreamConsents.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 text-center">
              {tx('dwallet.noPerStreamConsents', 'No per-stream consents configured yet.')}
            </p>
          ) : (
            perStreamConsents.map(consent => (
              <ConsentToggle
                key={consent.streamKey}
                streamKey={consent.streamKey}
                label={tx(getStreamLabelKey(consent.streamKey), consent.label)}
                granted={consent.granted}
                subtitle={
                  consent.description
                    ? tx(getStreamDescKey(consent.streamKey), consent.description)
                    : undefined
                }
                dateLine={
                  consent.granted && consent.grantedAt
                    ? tx('dwallet.grantedOn', 'Granted {date}', {
                        date: formatDate(consent.grantedAt),
                      })
                    : consent.revokedAt
                      ? tx('dwallet.revokedPaused', 'Revoked {date} (paused)', {
                          date: formatDate(consent.revokedAt),
                        })
                      : tx('dwallet.noConsentGranted', 'No consent granted')
                }
                onToggle={onToggle}
                isPending={isUpdating}
              />
            ))
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              {tx(
                'dwallet.consentRevokeInfo',
                'Revoking consent stops future data usage for that stream. Past value earned is not affected. To stop receiving future rewards, use the Resident Data Share Program toggle above.'
              )}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              {tx(
                'dwallet.consentLoggedInfo',
                'All consent changes are logged and retained for 5 years per Schedule G4.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
