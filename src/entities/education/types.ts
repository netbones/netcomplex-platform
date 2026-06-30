export interface Bursary {
  id: string;
  title: string;
  org: string;
  field: string;
  amount: string;
  period: string;
  desc: string;
  deadline: string;
  status: 'open' | 'closing' | 'closed';
}

export interface Resource {
  id: string;
  title: string;
  org: string;
  type: string;
  desc: string;
  link: string;
  tags: string[];
}

export interface GutenbergBook {
  title: string;
  author: string;
  id: string;
  stripe: string;
}

export type EducationTabId = 'bursaries' | 'resources' | 'saved';

export interface FilterState {
  query: string;
  field: string;
  type: string;
}
