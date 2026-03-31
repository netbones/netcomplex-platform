'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CARD_ANIMATIONS } from '@/lib/constants';
import { usePageLoading } from '@/hooks/usePageLoading';

const defaultServiceCategories = [
  {
    id: 'maintenance',
    title: 'Maintenance',
    subtitle: 'Professional repair & upkeep',
    icon: 'fa-tools',
    gradient: 'from-blue-500 to-blue-600',
    items: [
      '24/7 Emergency Repairs',
      'Plumbing & Electrical',
      'Solar Maintenance',
      'Appliance Repair',
      'Preventive Maintenance',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Safety & peace of mind',
    icon: 'fa-shield-alt',
    gradient: 'from-orange-500 to-orange-600',
    items: [
      '24/7 Security Patrol',
      'Access Control System',
      'CCTV Monitoring',
      'Emergency Response',
      'Visitor Management',
    ],
  },
  {
    id: 'landscaping',
    title: 'Landscaping',
    subtitle: 'Beautiful outdoor spaces',
    icon: 'fa-leaf',
    gradient: 'from-green-500 to-green-600',
    items: [
      'Garden Maintenance',
      'Lawn Care Services',
      'Tree & Shrub Care',
      'Irrigation Systems',
      'Seasonal Planting',
    ],
  },
];

const additionalServices = [
  {
    icon: 'fa-car',
    title: 'Parking Management',
    desc: 'Assigned parking spaces, remotes and visitor access',
    id: 'parking',
  },
  {
    icon: 'fa-wifi',
    title: 'Internet & Cable',
    desc: 'High-speed internet and Satellite services',
    id: 'internet',
  },
  {
    icon: 'fa-recycle',
    title: 'Waste Management',
    desc: 'Recycling and waste collection services',
    id: 'waste',
  },
  {
    icon: 'fa-swimming-pool',
    title: 'Amenity Access',
    desc: 'Pool, gym, and community center access',
    id: 'amenities',
  },
];

const serviceHours = [
  { service: 'Management Office', hours: 'Mon-Fri: 8AM-5PM' },
  { service: 'Maintenance', hours: 'Mon-Sat: 7AM-6PM' },
  { service: 'Emergency Services', hours: '24/7 Available', highlight: true },
  { service: 'Security', hours: '24/7 On-Site', highlight: true },
  { service: 'Amenities', hours: 'Daily: 6AM-10PM' },
];

const emergencyContacts = [
  {
    icon: 'fa-phone-alt',
    label: 'Emergency Line',
    phone: '+27 21 555-HELP (4357)',
    bg: 'bg-red-50',
    text: 'text-red-800',
    iconColor: 'text-red-600',
  },
  {
    icon: 'fa-shield-alt',
    label: 'Security',
    phone: '+27 21 555-SAFE (7233)',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
  {
    icon: 'fa-tools',
    label: 'Maintenance',
    phone: '+27 21 555-FIXIT (34948)',
    bg: 'bg-green-50',
    text: 'text-green-800',
    iconColor: 'text-green-600',
  },
  {
    icon: 'fa-building',
    label: 'Management Office',
    phone: '+27 21 555-MGMT (6468)',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    iconColor: 'text-purple-600',
  },
];

export default function ServicesPage() {
  const { t } = useTranslation('services');
  const [serviceCategories, setServiceCategories] = useState(defaultServiceCategories);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    serviceType: '',
    priority: 'low',
    description: '',
    preferredDate: '',
    preferredTime: '',
  });

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
    ],
    { additionalLoading: loading }
  );

  const { t: tCommon } = useTranslation('common');

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch('/api/content?category=SERVICES&published=true');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setServiceCategories(
              data.map((item: any) => ({
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
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  const handleServiceRequest = async (serviceId: string, serviceTitle: string) => {
    setSelectedService(serviceTitle);
    setFormData(prev => ({ ...prev, serviceType: serviceId }));
  };

  if (!isReady) {
    return LoadingComponent;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res.ok) {
        alert('Service request submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
    }
    setSelectedService(null);
    setFormData({
      serviceType: '',
      priority: 'low',
      description: '',
      preferredDate: '',
      preferredTime: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[{ label: tCommon('nav.home'), href: '/' }, { label: tCommon('nav.services') }]}
      />
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {serviceCategories.map(service => (
          <div
            key={service.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden hover:scale-[1.02] hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
          >
            <div className={`bg-gradient-to-r ${service.gradient} p-6 text-white`}>
              <div className="flex items-center">
                <i className={`fas ${service.icon} text-3xl mr-4`}></i>
                <div>
                  <h2 className="text-2xl font-bold">{service.title}</h2>
                  <p className="opacity-90">{service.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {service.items.map((item, idx) => (
                  <li key={idx} className="flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-3"></i>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleServiceRequest(service.id, service.title)}
                className="w-full mt-6 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('requestService')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`bg-white rounded-lg shadow-lg p-8 mb-12 hover:scale-[1.01] hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {t('additionalServices')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {additionalServices.map(service => (
            <div
              key={service.id}
              className={`text-center p-6 border border-gray-200 rounded-lg hover:shadow-md ${CARD_ANIMATIONS.hover} ${CARD_ANIMATIONS.transition}`}
            >
              <i className={`fas ${service.icon} text-4xl text-indigo-600 mb-4`}></i>
              <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{service.desc}</p>
              <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                {t('learnMore')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div
          className={`bg-white rounded-lg shadow-lg p-8 hover:scale-[1.01] hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('serviceHours')}</h2>
          <div className="space-y-4">
            {serviceHours.map(item => (
              <div
                key={item.service}
                className="flex justify-between items-center py-2 border-b border-gray-200"
              >
                <span className="font-medium">{item.service}</span>
                <span className={item.highlight ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {item.hours}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`bg-white rounded-lg shadow-lg p-8 hover:scale-[1.01] hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('emergencyContacts')}</h2>
          <div className="space-y-4">
            {emergencyContacts.map(contact => (
              <div
                key={contact.label}
                className={`flex items-center space-x-4 p-4 ${contact.bg} rounded-lg`}
              >
                <i className={`fas ${contact.icon} ${contact.iconColor} text-xl`}></i>
                <div>
                  <p className={`font-semibold ${contact.text}`}>{contact.label}</p>
                  <p className={contact.iconColor.replace('text-', 'text-')}>{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`bg-white rounded-lg shadow-lg p-8 hover:scale-[1.01] hover:shadow-xl ${CARD_ANIMATIONS.transition}`}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          {t('requestServiceForm')}
        </h2>
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('serviceType')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={formData.serviceType}
                onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
              >
                <option value="">{t('selectService')}</option>
                <option value="maintenance">{t('maintenance')}</option>
                <option value="security">{t('security')}</option>
                <option value="landscaping">{t('landscaping')}</option>
                <option value="parking">{t('parking')}</option>
                <option value="internet">{t('internet')}</option>
                <option value="waste">{t('waste')}</option>
                <option value="amenities">{t('amenities')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('priority')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('description')}
            </label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder={t('descriptionPlaceholder')}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('preferredDate')}
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={formData.preferredDate}
                onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('preferredTime')}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={formData.preferredTime}
                onChange={e => setFormData({ ...formData, preferredTime: e.target.value })}
              >
                <option value="">{t('anyTime')}</option>
                <option value="morning">{t('morning')}</option>
                <option value="afternoon">{t('afternoon')}</option>
                <option value="evening">{t('evening')}</option>
              </select>
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-indigo-600 text-white py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {t('submitRequest')}
            </button>
          </div>
        </form>
      </div>

      {selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('requestServiceTitle', { service: selectedService })}
                </h2>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('serviceType')}
                  </label>
                  <input
                    type="text"
                    value={selectedService}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                    readOnly
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('priority')}
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">{t('low')}</option>
                    <option value="medium">{t('medium')}</option>
                    <option value="high">{t('high')}</option>
                    <option value="emergency">{t('emergency')}</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('description')}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder={t('descriptionPlaceholder')}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('preferredDate')}
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.preferredDate}
                      onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('preferredTime')}
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      value={formData.preferredTime}
                      onChange={e => setFormData({ ...formData, preferredTime: e.target.value })}
                    >
                      <option value="">{t('anyTime')}</option>
                      <option value="morning">{t('morning')}</option>
                      <option value="afternoon">{t('afternoon')}</option>
                      <option value="evening">{t('evening')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-paper-plane mr-2"></i>
                    {t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
