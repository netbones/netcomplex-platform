export const SERVICE_MARKETPLACE_CATEGORIES = {
  COMMUNITY: [
    'TUTORING',
    'PET_CARE',
    'CHILDCARE',
    'TRANSPORT',
    'HEALTH_WELLNESS',
    'TECHNOLOGY',
    'CREATIVE_ARTS',
    'HOME_HELP',
    'LEGAL_FINANCIAL',
    'OTHER',
  ],
  THIRD_PARTY: [
    'GARDENING',
    'MAINTENANCE',
    'PLUMBING',
    'ELECTRICAL',
    'CLEANING',
    'SECURITY',
    'PEST_CONTROL',
    'APPLIANCE_REPAIR',
    'OTHER',
  ],
} as const;

export const defaultServiceCategories = [
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

export const additionalServices = [
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

export const serviceHours = [
  { service: 'Management Office', hours: 'Mon-Fri: 8AM-5PM' },
  { service: 'Maintenance', hours: 'Mon-Sat: 7AM-6PM' },
  { service: 'Emergency Services', hours: '24/7 Available', highlight: true },
  { service: 'Security', hours: '24/7 On-Site', highlight: true },
  { service: 'Amenities', hours: 'Daily: 6AM-10PM' },
];

export const emergencyContacts = [
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
