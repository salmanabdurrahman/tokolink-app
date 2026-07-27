import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const dashboardLoaderData = vi.hoisted(() => vi.fn());

vi.mock("../../routes/dashboard", () => ({
  Route: { useLoaderData: dashboardLoaderData },
}));

import { Overview } from "../../routes/dashboard.index";

describe("dashboard overview", () => {
  it("shows a loading fallback while tenant data is unavailable", () => {
    dashboardLoaderData.mockReturnValue({
      tenant: null,
      productCount: 0,
      linkCount: 0,
      orderCount: 0,
      pendingPaymentCount: 0,
      completedOrderCount: 0,
      salesTotal: 0,
      salesDeltaPercent: null,
      availableBalance: 0,
    });

    const { container } = render(<Overview />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
