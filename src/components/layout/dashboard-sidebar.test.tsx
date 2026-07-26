import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
    span: "span",
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => {
    const href = params
      ? Object.entries(params).reduce((acc, [key, value]) => acc.replace(`$${key}`, value), to)
      : to;
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

import type { Tenant } from "@/lib/types";
import { DashboardSidebar } from "./dashboard-sidebar";

const tenant: Tenant = {
  slug: "toko-ibu-sari",
  name: "Toko Ibu Sari",
  tagline: "Kopi susu enak",
  avatar: "https://cdn.example.com/avatar.webp",
  whatsapp: "6281234567890",
  links: [],
  products: [],
};

function renderSidebar(overrides: Partial<React.ComponentProps<typeof DashboardSidebar>> = {}) {
  const props: React.ComponentProps<typeof DashboardSidebar> = {
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
    isMobile: false,
    setIsMobileOpen: vi.fn(),
    tenant,
    pathname: "/dashboard",
    signOut: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<DashboardSidebar {...props} />) };
}

describe("DashboardSidebar", () => {
  it("highlights the exact-matching overview tab and not other tabs", () => {
    renderSidebar({ pathname: "/dashboard" });

    expect(screen.getByRole("link", { name: /Overview/ })).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: /Produk/ })).not.toHaveClass("font-semibold");
  });

  it("highlights a nested route tab via startsWith matching", () => {
    renderSidebar({ pathname: "/dashboard/products/123" });

    expect(screen.getByRole("link", { name: /Produk/ })).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: /Overview/ })).not.toHaveClass("font-semibold");
  });

  it("does not treat the overview tab as active for nested dashboard routes", () => {
    renderSidebar({ pathname: "/dashboard/links" });

    expect(screen.getByRole("link", { name: /Overview/ })).not.toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: /Tautan/ })).toHaveClass("font-semibold");
  });

  it("shows the order count badge on the orders tab when there are pending orders", () => {
    renderSidebar({ pathname: "/dashboard/orders", orderCount: 7 });

    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("caps the order count badge at 99+", () => {
    renderSidebar({ pathname: "/dashboard/orders", orderCount: 250 });

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("does not render an order count badge when there are no pending orders", () => {
    renderSidebar({ pathname: "/dashboard/orders", orderCount: 0 });

    expect(screen.queryByText(/^\d+$|^99\+$/)).not.toBeInTheDocument();
  });

  it("links to the public storefront using the tenant slug", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: /Lihat toko/ })).toHaveAttribute(
      "href",
      "/toko-ibu-sari",
    );
  });

  it("hides labels and the store name when collapsed on desktop", () => {
    renderSidebar({ isCollapsed: true, isMobile: false });

    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Toko:/)).not.toBeInTheDocument();
  });

  it("shows labels even when collapsed on mobile", () => {
    renderSidebar({ isCollapsed: true, isMobile: true });

    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("calls signOut then navigates home when the sign-out button is clicked", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    renderSidebar({ signOut, navigate });

    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));

    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
  });

  it("toggles the collapsed state when the collapse button is clicked", () => {
    const setIsCollapsed = vi.fn();
    renderSidebar({ isCollapsed: false, isMobile: false, setIsCollapsed });

    fireEvent.click(screen.getByRole("button", { name: "Kecilkan menu" }));

    expect(setIsCollapsed).toHaveBeenCalledWith(true);
  });

  it("does not render the collapse toggle button on mobile", () => {
    renderSidebar({ isMobile: true });

    expect(screen.queryByRole("button", { name: /Kecilkan menu|Besarkan menu/ })).not.toBeInTheDocument();
  });

  it("closes the mobile menu when the close button is clicked", () => {
    const setIsMobileOpen = vi.fn();
    renderSidebar({ isMobile: true, setIsMobileOpen });

    fireEvent.click(screen.getByRole("button", { name: "Tutup menu" }));

    expect(setIsMobileOpen).toHaveBeenCalledWith(false);
  });

  it("does not render the mobile close button on desktop", () => {
    renderSidebar({ isMobile: false });

    expect(screen.queryByRole("button", { name: "Tutup menu" })).not.toBeInTheDocument();
  });
});
