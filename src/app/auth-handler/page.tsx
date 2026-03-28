'use client';

import dynamic from 'next/dynamic';

const StackHandler = dynamic(() => import('@stackframe/stack').then(mod => mod.StackHandler), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function AuthHandler() {
  return <StackHandler fullPage />;
}
