import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './app-router.types';

export const trpc = createTRPCReact<AppRouter>();
