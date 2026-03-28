import { StackClientApp } from '@stackframe/stack';

export const stackClient = new StackClientApp({
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_KEY || '',
  tokenStore: 'cookie',
});
