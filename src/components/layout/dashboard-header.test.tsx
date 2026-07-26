import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
import { DashboardHeader } from "./dashboard-header";

const tenant: Tenant = {
  slug: "toko-ibu-sari",
  name: "Toko Ibu Sari",
  tagline: "Kopi susu enak",
  avatar: "https://cdn.example.com/avatar.webp",
  whatsapp: "6281234567890",
  links: [],
  products: [],
};

describe("DashboardHeader", () => {
  it("renders the tenant slug and a link to the public storefront", () => {
    render(<DashboardHeader setIsMobileOpen={vi.fn()} tenant={tenant} />);

    expect(screen.getByText("toko-ibu-sari")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Toko ↗" })).toHaveAttribute("href", "/toko-ibu-sari");
  });

  it("renders an empty slug when tenant is null", () => {
    render(<DashboardHeader setIsMobileOpen={vi.fn()} tenant={null} />);

    expect(screen.getByRole("link", { name: "Toko ↗" })).toHaveAttribute("href", "/");
  });

  it("opens the mobile menu when the menu button is clicked", () => {
    const setIsMobileOpen = vi.fn();
    render(<DashboardHeader setIsMobileOpen={setIsMobileOpen} tenant={tenant} />);

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }));

    expect(setIsMobileOpen).toHaveBeenCalledWith(true);
  });

  it("does not render an order badge when orderCount is zero", () => {
    render(<DashboardHeader setIsMobileOpen={vi.fn()} tenant={tenant} />);

    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("renders the order count badge when there are pending orders", () => {
    render(<DashboardHeader setIsMobileOpen={vi.fn()} tenant={tenant} orderCount={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("caps the order count badge at 99+", () => {
    render(<DashboardHeader setIsMobileOpen={vi.fn()} tenant={tenant} orderCount={150} />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
