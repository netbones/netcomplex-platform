'use client';

interface PricingDisplayProps {
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE' | 'FREE';
  price?: number;
  currency?: string;
}

export function PricingDisplay({ priceType, price, currency = 'ZAR' }: PricingDisplayProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  switch (priceType) {
    case 'FREE':
      return <div className="text-lg font-semibold text-green-600">Free</div>;

    case 'QUOTE':
      return <div className="text-sm text-gray-600">Quote Required</div>;

    case 'FIXED':
      if (price !== undefined) {
        return <div className="text-lg font-semibold text-gray-900">{formatPrice(price)}</div>;
      }
      return <div className="text-sm text-gray-600">Price on Request</div>;

    case 'HOURLY':
      if (price !== undefined) {
        return (
          <div className="text-sm">
            <div className="text-lg font-semibold text-gray-900">{formatPrice(price)}</div>
            <div className="text-xs text-gray-600">per hour</div>
          </div>
        );
      }
      return <div className="text-sm text-gray-600">Hourly Rate</div>;

    default:
      return <div className="text-sm text-gray-600">Contact for Pricing</div>;
  }
}
