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
    subtitle: 'Submit & track repair requests',
    icon: 'fa-tools',
    gradient: 'from-blue-600 to-blue-700',
    items: [
      'Submit maintenance requests',
      'Track repair progress',
      'View request history',
      'Schedule preventive upkeep',
      'Emergency repairs',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Safety & access management',
    icon: 'fa-shield-alt',
    gradient: 'from-amber-600 to-amber-700',
    items: [
      'Visitor access management',
      'Incident reporting',
      'Emergency contacts',
      'Security patrol requests',
      'Gate & access control',
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    subtitle: 'Documents, approvals & requests',
    icon: 'fa-building',
    gradient: 'from-purple-600 to-purple-700',
    items: [
      'Submit building plan approvals',
      'Architectural review requests',
      'Rule compliance inquiries',
      'Move-in / move-out requests',
      'Document requests',
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
