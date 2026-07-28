import React from 'react';
import { HomeIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/ui/breadcrumb';
import { cn } from '@shared/lib/utils';

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemType[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className={cn('mb-6', className)}>
      <BreadcrumbList className="h-8 gap-2 rounded-full border px-3 text-sm">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <BreadcrumbItem>
                {idx === 0 && (
                  <BreadcrumbLink href={item.href ?? '/'}>
                    <HomeIcon className="size-4" />
                    <span className="sr-only">{item.label}</span>
                  </BreadcrumbLink>
                )}
                {idx > 0 && !isLast && (
                  <BreadcrumbLink href={item.href ?? '#'}>{item.label}</BreadcrumbLink>
                )}
                {idx > 0 && isLast && <BreadcrumbPage>{item.label}</BreadcrumbPage>}
              </BreadcrumbItem>
              {idx < items.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
