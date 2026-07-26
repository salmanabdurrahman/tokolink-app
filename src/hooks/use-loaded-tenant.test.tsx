import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTenant } from "@/lib/store";
import type { Tenant } from "@/lib/types";
import { useLoadedTenant } from "./use-loaded-tenant";

const tenant: Tenant = {
  slug: "kopi-ibu",
  name: "Kopi Ibu",
  tagline: "Kopi rumahan",
  avatar: "",
  whatsapp: "6281234567890",
  links: [],
  products: [],
};

describe("useLoadedTenant", () => {
  beforeEach(() => {
    act(() => {
      useTenant.setState({ tenant: null });
    });
  });

  afterEach(() => {
    act(() => {
      useTenant.setState({ tenant: null });
    });
  });

  it("returns loaded tenant when nothing hydrated yet", () => {
    const { result } = renderHook(() => useLoadedTenant<Tenant | null>(null));

    expect(result.current).toBeNull();
    expect(useTenant.getState().tenant).toBeNull();
  });

  it("hydrates store from loaded tenant and returns store value", () => {
    const { result } = renderHook(() => useLoadedTenant(tenant));

    expect(useTenant.getState().tenant).toEqual(tenant);
    expect(result.current).toEqual(tenant);
  });

  it("prefers store tenant over loaded tenant after hydration", () => {
    const { result, rerender } = renderHook(({ loaded }) => useLoadedTenant(loaded), {
      initialProps: { loaded: tenant as Tenant | null },
    });

    expect(result.current).toEqual(tenant);

    act(() => {
      useTenant.getState().setTenant({ ...tenant, name: "Kopi Baru" });
    });
    rerender({ loaded: tenant });

    expect(result.current).toMatchObject({ name: "Kopi Baru" });
  });
});
