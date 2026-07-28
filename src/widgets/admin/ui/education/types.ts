export interface BursaryRow {
  id: string;
  title: string;
  funder: string;
  fieldId: string;
  amount: string;
  description: string;
  applyUrl: string | null;
  deadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface ResourceRow {
  id: string;
  title: string;
  provider: string | null;
  externalUrl: string | null;
  mediaType: 'BOOK' | 'COURSE' | 'JOURNAL' | 'VIDEO' | null;
  featured: boolean;
  tags: string[];
  createdAt: string;
}

export interface BursaryField {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

export interface PinData {
  title: string;
  sub: string;
  link: string;
  btn: string;
}

export interface ShelfBook {
  title: string;
  author: string;
  gutId: string;
  stripe: string;
}

export interface EduSettings {
  pin: PinData;
  shelf: ShelfBook[];
}

export type TabId = 'pin' | 'bursaries' | 'resources' | 'shelf';
