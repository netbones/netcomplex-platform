export interface CategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  items: string[];
}

export interface EmergencyContactConfig {
  label: string;
  phone: string;
}

export interface HourConfig {
  service: string;
  hours: string;
  highlight: boolean;
}

export interface AdditionalServiceConfig {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface ServicesPageConfig {
  heroVisible: boolean;
  categoriesVisible: boolean;
  emergencyVisible: boolean;
  hoursVisible: boolean;
  additionalVisible: boolean;
  directoryCtaVisible: boolean;
  categories: CategoryConfig[];
  emergencyContacts: EmergencyContactConfig[];
  hours: HourConfig[];
  additionalServices: AdditionalServiceConfig[];
}
