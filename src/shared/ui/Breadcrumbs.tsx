import Link from 'next/link';

import { ChevronRight } from 'lucide-react';
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="text-sm mb-6">
      <ol className="flex items-center space-x-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center">
            {idx > 0 && <ChevronRight className="text-gray-400 text-xs mx-1" />}
            {item.href ? (
              <Link href={item.href} className="text-indigo-600 hover:text-indigo-800">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
