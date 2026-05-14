/**
 * Utility function to merge and conditionally apply CSS classes
 * Similar to clsx or classnames
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
