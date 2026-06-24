import { useGateContextStore } from './gate-context-store';

export function useGateContext(moduleKey: string): boolean {
  const { modules, hydrated } = useGateContextStore();
  if (!hydrated) return false;
  return modules[moduleKey] ?? false;
}
