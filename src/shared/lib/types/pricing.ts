import type { TierLevel } from '../constants/tiers';

export interface PricingPlan {
  id: TierLevel;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  maxPages: number;
  color: string;
}
