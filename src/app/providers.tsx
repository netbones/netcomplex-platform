'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { authClient } from '@api/auth-client';
import { TooltipProvider } from '@shared/ui';
import { trpc } from '@api/trpc/client';
// eslint-disable-next-line no-restricted-imports -- barrel deliberately excludes client-only i18n
import '@shared/lib/i18n';
import * as React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => {
    return trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          async headers() {
            const session = await authClient.getSession();
            return {
              Authorization: session?.data?.session
                ? `Bearer ${session.data.session.token}`
                : undefined,
            };
          },
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
