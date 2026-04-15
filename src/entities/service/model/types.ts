export interface ServiceCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  items: string[];
}

export interface AdditionalService {
  icon: string;
  title: string;
  desc: string;
  id: string;
}

export interface ServiceHour {
  service: string;
  hours: string;
  highlight?: boolean;
}

export interface EmergencyContact {
  icon: string;
  label: string;
  phone: string;
  bg: string;
  text: string;
  iconColor: string;
}

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  published: boolean;
  publishedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
  };
}
