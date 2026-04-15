'use client';

interface PricingDisplayProps {
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE' | 'FREE';
  price?: number;
  currency?: string;
}

export function PricingDisplay({ priceType, price, currency = 'ZAR' }: PricingDisplayProps) {
  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
    }).format(p);
  };

  if (priceType === 'FREE') {
    return <span className="text-green-600 font-bold uppercase">Free</span>;
  }

  if (priceType === 'QUOTE') {
    return <span className="text-gray-600 font-medium uppercase">Request Quote</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-lg font-bold text-indigo-600">
        {price ? formatPrice(price) : 'Contact for Price'}
      </span>
      {priceType === 'HOURLY' && <span className="text-xs text-gray-500 italic">per hour</span>}
    </div>
  );
}
