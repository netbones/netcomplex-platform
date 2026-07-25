'use client';

import { formatCurrency } from '../api/adminApi';

interface RevenueChartProps {
  title: string;
  description: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  currency?: string;
  formatAsCurrency?: boolean;
  emptyMessage?: string;
}

export function RevenueChart({
  title,
  description,
  data,
  currency = 'ZAR',
  formatAsCurrency = true,
  emptyMessage = 'No data available for the selected filters.',
}: RevenueChartProps) {
  const maxValue = Math.max(...data.map(item => item.value), 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="mt-5 space-y-4">
        {data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          data.map(item => {
            const width = maxValue > 0 ? Math.max(6, Math.round((item.value / maxValue) * 100)) : 0;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="text-gray-500">
                    {formatAsCurrency
                      ? formatCurrency(item.value, currency)
                      : item.value.toLocaleString('en-ZA')}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color ?? 'bg-indigo-500'}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
