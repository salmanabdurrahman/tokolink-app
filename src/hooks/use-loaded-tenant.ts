import { useEffect, useState } from "react";
import { useTenant } from "@/lib/store";
import type { Tenant } from "@/lib/types";

export function useLoadedTenant<T>(loadedTenant: T | null) {
  const storeTenant = useTenant((s) => s.tenant);
  const setTenant = useTenant((s) => s.setTenant);
  const [hasHydratedTenant, setHasHydratedTenant] = useState(false);

  useEffect(() => {
    if (!loadedTenant) return;
    setTenant(loadedTenant as unknown as Tenant);
    setHasHydratedTenant(true);
  }, [loadedTenant, setTenant]);

  return (hasHydratedTenant ? storeTenant : loadedTenant) as T | null;
}
