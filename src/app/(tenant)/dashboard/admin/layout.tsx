import type { ReactNode } from 'react';

/**
 * Admin space layout — pass-through for admin sub-pages.
 * Future: add admin-specific breadcrumbs or header.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
