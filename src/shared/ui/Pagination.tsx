'use client';

import { cn } from '@shared/lib/utils';
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@shared/ui/pagination-primitives';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrev = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <ShadcnPagination className={cn('transition-all', className)}>
      <PaginationContent className="bg-background/80 border p-1 rounded-full">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={e => {
              e.preventDefault();
              handlePrev();
            }}
            className="rounded-full hover:bg-muted [&>span]:hidden"
          />
        </PaginationItem>

        <div className="relative flex items-center mx-1">
          {Array.from({ length: totalPages }, (_, i) => {
            const page = i + 1;
            const isActive = currentPage === page;
            return (
              <PaginationItem key={page} className="relative">
                <PaginationLink
                  href="#"
                  isActive={isActive}
                  onClick={e => {
                    e.preventDefault();
                    onPageChange(page);
                  }}
                  className={cn(
                    'relative z-10 w-9 h-9 rounded-full border-0 transition-colors uppercase text-xs font-bold tracking-tighter',
                    isActive
                      ? 'bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {page}
                </PaginationLink>
                {isActive && <div className="absolute inset-0 bg-primary rounded-full shadow-md" />}
              </PaginationItem>
            );
          })}
        </div>

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={e => {
              e.preventDefault();
              handleNext();
            }}
            className="rounded-full hover:bg-muted transition-transform active:scale-95 [&>span]:hidden"
          />
        </PaginationItem>
      </PaginationContent>
    </ShadcnPagination>
  );
}
