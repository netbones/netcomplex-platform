'use client';

import { useGateContext, useGateContextStore } from '@entities/tenant';

interface ModuleGateWallProps {
  moduleKey: string;
  moduleName: string;
  children: React.ReactNode;
}

export function ModuleGateWall({ moduleKey, moduleName, children }: ModuleGateWallProps) {
  const hydrated = useGateContextStore(s => s.hydrated);
  const isAvailable = useGateContext(moduleKey);

  if (!hydrated) return null;
  if (!isAvailable) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{moduleName}</h2>
        <p className="text-sm text-gray-500 max-w-md">
          This feature is available on Premium tier. Contact your community administrator to
          upgrade.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
