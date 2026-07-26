import * as React from 'react';

import { cn } from '@shared/lib/utils';

const AvatarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex -space-x-2 *:ring-2 *:ring-background', className)}
      {...props}
    />
  )
);
AvatarGroup.displayName = 'AvatarGroup';

const AvatarGroupCount = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs',
        className
      )}
      {...props}
    />
  )
);
AvatarGroupCount.displayName = 'AvatarGroupCount';

export { AvatarGroup, AvatarGroupCount };
