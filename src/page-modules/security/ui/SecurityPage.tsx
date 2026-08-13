'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EyeOff, History, MapPin, MoreVertical, Phone, ShieldAlert, BookUser } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { apiGet, apiPost, ApiClientError } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import { authClient } from '@/shared/api/auth-client';
import { hasPermission } from '@shared/lib';
import type { SecurityContactPublic } from '@entities/security';
import {
  EMERGENCY_DIAL_NUMBER,
  SECURITY_DISCLAIMER_PLACEHOLDER,
  toTelHref,
} from '@entities/security';
import { HoldPanicButton } from './HoldPanicButton';

const log = createComponentLogger('SecurityPage');

type PanicPhase = 'idle' | 'sending' | 'sent' | 'failed';

interface ContactsResponse {
  contacts: SecurityContactPublic[];
  defaultContact: SecurityContactPublic | null;
}

export function SecurityPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [defaultContact, setDefaultContact] = useState<SecurityContactPublic | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [panicPhase, setPanicPhase] = useState<PanicPhase>('idle');
  const [panicMessage, setPanicMessage] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipText, setTipText] = useState('');
  const [canManageContacts, setCanManageContacts] = useState(false);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Security', href: '/security' },
    ],
    { additionalLoading: loadingContacts }
  );

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await apiGet<ContactsResponse>('/api/security/contacts');
      setDefaultContact(data.defaultContact ?? null);
    } catch (error) {
      log.error({}, 'Failed to load security contacts', error);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
    void authClient.getSession().then(session => {
      const role = session?.data?.user?.role as string | undefined;
      setCanManageContacts(hasPermission(role, 'admin'));
    });
  }, [loadContacts]);

  const captureLocation = (): Promise<GeolocationPosition | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });

  const handlePanicConfirm = async () => {
    setPanicPhase('sending');
    setPanicMessage(null);
    try {
      const pos = await captureLocation();
      const payload = {
        latitude: pos?.coords.latitude ?? null,
        longitude: pos?.coords.longitude ?? null,
        locationAccuracyM: pos?.coords.accuracy ?? null,
      };
      await apiPost('/api/security/panic', payload);
      setPanicPhase('sent');
      setPanicMessage('Alert sent — security has been notified.');
      toast.success('Panic alert sent');
    } catch (error) {
      setPanicPhase('failed');
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Could not send alert. Use Call security or Call 10111 now.';
      setPanicMessage(message);
      toast.error(message);
    }
  };

  const submitTip = async () => {
    const message = tipText.trim();
    if (!message) return;
    try {
      await apiPost('/api/security/tips', { message });
      toast.success('Anonymous tip submitted');
      setTipText('');
      setTipOpen(false);
    } catch (error) {
      log.error({}, 'Tip submit failed', error);
      toast.error('Failed to submit tip');
    }
  };

  if (!isReady) return LoadingComponent;

  const securityTel = defaultContact ? toTelHref(defaultContact.phone) : null;

  return (
    <ErrorBoundary>
      <main className="relative min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/platform/patterns/pattern.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '500px',
          }}
        />
        <div className="absolute inset-0 bg-white/80" />
        <div className="relative max-w-md mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Security' }]} />

          <div className="flex items-center justify-between mt-6 mb-6">
            <div className="flex items-center gap-2.5">
              <DomainIconBadge id="security" variant="services" size="md" />
              <h1 className="text-xl font-semibold text-gray-900 m-0">Security</h1>
            </div>
            <div className="relative">
              <button
                type="button"
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-20 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {canManageContacts && (
                    <Link
                      href="/admin/security/contacts"
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <BookUser className="w-4 h-4" />
                      Manage security contacts
                    </Link>
                  )}
                  <Link
                    href="/security/history"
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 border-t border-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    <History className="w-4 h-4" />
                    View alert history
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-red-200 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <HoldPanicButton
              disabled={panicPhase === 'sending'}
              onConfirm={() => void handlePanicConfirm()}
            />
            <p className="text-xs text-red-700 mt-3 max-w-[280px] mx-auto">
              Security only responds to requests made and located within the community boundaries.
            </p>
            {panicMessage && (
              <p
                className={`text-sm mt-3 font-medium ${panicPhase === 'failed' ? 'text-red-800' : 'text-green-800'}`}
              >
                {panicMessage}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-900">Location sharing on</div>
              <div className="text-xs text-gray-500">
                GPS attaches automatically when you trigger an alert
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            <p className="text-sm font-medium text-gray-900 mb-2.5 flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              Create alert
            </p>
            {!tipOpen ? (
              <button
                type="button"
                className="w-full py-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setTipOpen(true)}
              >
                Anonymous tip-off
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm min-h-[88px]"
                  placeholder="Describe what you observed…"
                  value={tipText}
                  onChange={e => setTipText(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 text-sm bg-gray-900 text-white rounded-lg"
                    onClick={() => void submitTip()}
                  >
                    Submit tip
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    onClick={() => setTipOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-2.5 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Call response
            </p>
            <div className="flex gap-2.5">
              <a
                href={`tel:${EMERGENCY_DIAL_NUMBER}`}
                className="flex-1 py-3 text-sm text-center border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Call {EMERGENCY_DIAL_NUMBER}
              </a>
              <a
                href={securityTel ?? undefined}
                className={cnFlexButton(!securityTel)}
                aria-disabled={!securityTel}
                onClick={e => {
                  if (!securityTel) e.preventDefault();
                }}
              >
                Call security
              </a>
            </div>
            {!securityTel && (
              <p className="text-xs text-amber-700 mt-2">No default security contact configured.</p>
            )}
          </div>

          <p className="text-xs text-center text-gray-500">
            Using these functions means you agree to the{' '}
            <Link href="/security/disclaimer" className="underline">
              security disclaimer
            </Link>
            . {SECURITY_DISCLAIMER_PLACEHOLDER}
          </p>
        </div>
      </main>
    </ErrorBoundary>
  );
}

function cnFlexButton(disabled: boolean) {
  return [
    'flex-1 py-3 text-sm text-center border border-gray-300 rounded-lg',
    disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50',
  ].join(' ');
}
