'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { usePageLoading, Breadcrumbs, ErrorBoundary, ModalOverlay } from '@shared/ui';
import { CARD_ANIMATIONS, createComponentLogger } from '@shared/lib';
import {
  defaultServiceCategories as defaultCats,
  additionalServices as defaultAdditional,
  serviceHours as defaultHours,
  emergencyContacts as defaultEmergency,
  type ContentItem,
} from '@entities/service';

const log = createComponentLogger('services-page');

interface ServicesConfig {
  heroVisible: boolean;
  categoriesVisible: boolean;
  emergencyVisible: boolean;
  hoursVisible: boolean;
  additionalVisible: boolean;
  directoryCtaVisible: boolean;
  categories: Array<{ id: string; title: string; subtitle: string; icon: string; items: string[] }>;
  emergencyContacts: Array<{ label: string; phone: string }>;
  hours: Array<{ service: string; hours: string; highlight: boolean }>;
  additionalServices: Array<{ id: string; icon: string; title: string; desc: string }>;
}

const SERVICE_THEMES: Record<
  string,
  { accent: string; panel: string; icon: string; light: string; gradient: string }
> = {
  maintenance: {
    accent: 'bg-blue-600',
    panel: 'bg-blue-50',
    icon: 'text-blue-600',
    light: 'bg-blue-500',
    gradient: 'from-blue-600 to-blue-700',
  },
  security: {
    accent: 'bg-amber-600',
    panel: 'bg-amber-50',
    icon: 'text-amber-600',
    light: 'bg-amber-500',
    gradient: 'from-amber-600 to-amber-700',
  },
  administration: {
    accent: 'bg-purple-600',
    panel: 'bg-purple-50',
    icon: 'text-purple-600',
    light: 'bg-purple-500',
    gradient: 'from-purple-600 to-purple-700',
  },
};

const EMERGENCY_VISUALS = [
  { icon: 'fa-phone-alt', bg: 'bg-red-50', text: 'text-red-800', iconColor: 'text-red-600' },
  { icon: 'fa-shield-alt', bg: 'bg-blue-50', text: 'text-blue-800', iconColor: 'text-blue-600' },
  { icon: 'fa-tools', bg: 'bg-green-50', text: 'text-green-800', iconColor: 'text-green-600' },
  {
    icon: 'fa-building',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    iconColor: 'text-purple-600',
  },
];

const FORM_INITIAL = {
  serviceType: '',
  priority: 'low',
  description: '',
  preferredDate: '',
  preferredTime: '',
};

export function ServicesPage() {
  const { t, i18n } = useTranslation('services');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const [serviceCategories, setServiceCategories] = useState(defaultCats);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(FORM_INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<ServicesConfig | null>(null);

  const [cfgCategories, setCfgCategories] = useState(defaultCats);
  const [cfgEmergency, setCfgEmergency] = useState(defaultEmergency);
  const [cfgHours, setCfgHours] = useState(defaultHours);
  const [cfgAdditional, setCfgAdditional] = useState(defaultAdditional);

  const { isReady, LoadingComponent } = usePageLoading([], { additionalLoading: loading });

  useEffect(() => {
    async function fetchAll() {
      try {
        const [contentRes, configRes] = await Promise.all([
          fetch('/api/content?category=SERVICES&published=true&locale=${i18n.language}'),
          fetch('/api/admin/services-config'),
        ]);

        if (contentRes.ok) {
          const body = await contentRes.json();
          const data = body?.data ?? [];
          if (data.length > 0) {
            setServiceCategories(
              data.map((item: ContentItem) => ({
                id: String(item.id),
                title: item.title,
                subtitle: item.excerpt || '',
                icon: 'fa-concierge-bell',
                gradient: 'from-blue-500 to-blue-600',
                items: [item.content.substring(0, 200) + '...'],
              }))
            );
          }
        }

        if (configRes.ok) {
          const body = await configRes.json();
          const cfg = body?.data ?? body;
          if (cfg && cfg.categoriesVisible !== undefined) {
            setConfig(cfg);
            if (cfg.categories?.length) setCfgCategories(cfg.categories);
            if (cfg.hours?.length) setCfgHours(cfg.hours);
            if (cfg.additionalServices?.length) setCfgAdditional(cfg.additionalServices);
            if (cfg.emergencyContacts?.length) {
              setCfgEmergency(
                cfg.emergencyContacts.map((c: { label: string; phone: string }, i: number) => {
                  const v = EMERGENCY_VISUALS[i % EMERGENCY_VISUALS.length];
                  return { ...v, label: c.label, phone: c.phone };
                })
              );
            }
          }
        }
      } catch (error) {
        log.error({}, 'Failed to fetch services data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [i18n.language]);

  const openForm = useCallback((serviceId: string, serviceTitle: string) => {
    setSelectedService(serviceTitle);
    setFormData(prev => ({ ...prev, serviceType: serviceId }));
  }, []);

  const closeForm = useCallback(() => {
    setSelectedService(null);
    setFormData(FORM_INITIAL);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.serviceType,
          priority: formData.priority.toUpperCase(),
          description: formData.description,
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
        }),
      });
      if (res.ok) alert('Service request submitted successfully!');
    } catch (error) {
      log.error({}, 'Failed to submit request', error);
    } finally {
      setSubmitting(false);
    }
    closeForm();
  };

  const catNav =
    config?.categoriesVisible !== false
      ? config?.categories?.length
        ? cfgCategories
        : serviceCategories
      : [];
  const catCards =
    config?.categoriesVisible !== false
      ? config?.categories?.length
        ? cfgCategories
        : serviceCategories
      : [];
  const showEmergency = config?.emergencyVisible !== false;
  const showHours = config?.hoursVisible !== false;
  const showAdditional = config?.additionalVisible !== false;
  const showDirectory = config?.directoryCtaVisible !== false;
  const showHero = config?.heroVisible !== false;

  if (!isReady) return LoadingComponent;

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.services') }]}
          />

          {showHero && (
            <section className="rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white mb-12">
              <div className="p-10 lg:p-14">
                <div className="flex items-start gap-4 mb-8">
                  <img
                    src="/platform/services.svg"
                    alt=""
                    className="w-10 h-10 mt-1.5 hidden sm:block brightness-0 invert"
                  />
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold">{t('title')}</h1>
                    <p className="text-lg text-blue-100 max-w-2xl mt-2">{t('subtitle')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <StatCard value="24/7" label={t('stats.support')} />
                  <StatCard value={String(catNav.length)} label={t('stats.categories')} />
                  <StatCard
                    value={String(cfgAdditional.length + catNav.length)}
                    label={t('stats.services')}
                  />
                </div>
              </div>
            </section>
          )}

          {catNav.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-12">
              <span className="text-sm font-semibold text-gray-500 self-center mr-2">
                {t('quickNav')}:
              </span>
              {catNav.map(cat => {
                const theme = SERVICE_THEMES[cat.id] || SERVICE_THEMES.maintenance;
                return (
                  <button
                    key={cat.id}
                    onClick={() => openForm(cat.id, cat.title)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:shadow-md ${theme.panel} ${theme.icon} border-gray-200 hover:border-current`}
                  >
                    <i className={`fas ${cat.icon}`} />
                    {cat.title}
                  </button>
                );
              })}
            </div>
          )}

          {showEmergency && (
            <section className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-8 mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🚨</span>
                <h2 className="text-2xl font-bold text-red-900">{t('emergencyContacts')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cfgEmergency.map(contact => (
                  <a
                    key={contact.label}
                    href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                    className={`flex items-center gap-4 p-4 rounded-xl ${contact.bg} hover:shadow-md transition-shadow`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${contact.iconColor} bg-white/80 flex items-center justify-center`}
                    >
                      <i className={`fas ${contact.icon}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${contact.text}`}>{contact.label}</p>
                      <p className={`text-sm ${contact.iconColor}`}>{contact.phone}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {catCards.length > 0 && (
            <section className="mb-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {catCards.map(service => {
                  const theme = SERVICE_THEMES[service.id] || SERVICE_THEMES.maintenance;
                  return (
                    <div
                      key={service.id}
                      className={`rounded-2xl overflow-hidden bg-white border border-gray-200 hover:shadow-2xl hover:-translate-y-1 ${CARD_ANIMATIONS.transition}`}
                    >
                      <div className={theme.accent + ' h-2'} />
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl ${theme.panel} flex items-center justify-center`}
                          >
                            <i className={`fas ${service.icon} text-2xl ${theme.icon}`} />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">{service.title}</h2>
                            <p className="text-sm text-gray-500">{service.subtitle}</p>
                          </div>
                        </div>
                        <ul className="space-y-3 mb-6">
                          {service.items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                              <i className={`fas fa-check-circle mt-0.5 ${theme.icon}`} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => openForm(service.id, service.title)}
                          className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all ${theme.accent} hover:brightness-110 shadow-md hover:shadow-lg`}
                        >
                          {t('requestService')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {showHours && (
            <section className="bg-white rounded-2xl border border-gray-200 p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('serviceHours')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cfgHours.map(item => (
                  <div
                    key={item.service}
                    className={`p-5 rounded-xl border ${item.highlight ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'} hover:shadow-md transition-shadow`}
                  >
                    <p className="font-semibold text-gray-900">{item.service}</p>
                    <p
                      className={
                        item.highlight ? 'text-red-700 font-medium mt-1' : 'text-gray-600 mt-1'
                      }
                    >
                      {item.hours}
                    </p>
                    {item.highlight && (
                      <span className="inline-block mt-2 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        24/7
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {showAdditional && (
            <section className="bg-slate-50 rounded-3xl p-8 lg:p-10 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                {t('additionalServices')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cfgAdditional.map(service => (
                  <div
                    key={service.id}
                    className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                      <i className={`fas ${service.icon} text-xl text-indigo-600`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{service.desc}</p>
                    <button
                      onClick={() => openForm(service.id, service.title)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {t('requestService')} →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showDirectory && (
            <section className="rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white mb-12">
              <div className="p-10 lg:p-14 text-center">
                <h2 className="text-3xl font-bold mb-3">{t('needContractor')}</h2>
                <p className="text-indigo-200 mb-8 max-w-xl mx-auto">{t('needContractorDesc')}</p>
                <button
                  onClick={() => router.push('/directory')}
                  className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  <i className="fas fa-store" />
                  {t('browseDirectory')}
                </button>
              </div>
            </section>
          )}
        </div>

        {selectedService && (
          <ModalOverlay onClose={closeForm}>
            <div className="max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('requestServiceForm')}</h2>
              <p className="text-gray-500 mb-6">{selectedService}</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('serviceType')}
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                      value={formData.serviceType}
                      onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                      required
                    >
                      <option value="">{t('selectService')}</option>
                      <option value="maintenance">{t('maintenance')}</option>
                      <option value="security">{t('security')}</option>
                      <option value="administration">{t('administration')}</option>
                      {cfgAdditional.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('priority')}
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">{t('low')}</option>
                      <option value="medium">{t('medium')}</option>
                      <option value="high">{t('high')}</option>
                      <option value="emergency">{t('emergency')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('description')}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm resize-none"
                    placeholder={t('descriptionPlaceholder')}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('preferredDate')}
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                      value={formData.preferredDate}
                      onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('preferredTime')}
                    </label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                      value={formData.preferredTime}
                      onChange={e => setFormData({ ...formData, preferredTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {submitting ? tCommon('loading') || 'Submitting...' : t('submitRequest')}
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}
      </div>
    </ErrorBoundary>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-blue-200 mt-1">{label}</p>
    </div>
  );
}
