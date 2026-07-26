import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderDetail } from "./order-detail";
import { makePrismaOrder } from "@/test/factories";
import type { TenantOrder } from "@/lib/types";

function makeOrder(overrides: Record<string, unknown> = {}) {
  return makePrismaOrder({
    courier: "jne",
    shippingService: "REG",
    shippingEtd: "1-2 hari",
    shippingWeightGram: 500,
    trackingNumber: "RESI123",
    shippedAt: null,
    paidAt: null,
    items: [
      {
        id: "item-1",
        productName: "Kopi Susu",
        variantName: "Small",
        qty: 1,
        unitPrice: 10000,
        totalPrice: 10000,
      },
    ],
    ...overrides,
  }) as unknown as TenantOrder;
}

describe("OrderDetail", () => {
  it("renders customer, item, payment, and shipping sections", () => {
    const order = makeOrder();
    render(<OrderDetail order={order} savingId="" onUpdateStatus={vi.fn()} />);

    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("Kopi Susu")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText(/RESI123/)).toBeInTheDocument();
  });

  it("shows fallback text when email is missing", () => {
    const order = makeOrder({ customerEmail: "" });
    render(<OrderDetail order={order} savingId="" onUpdateStatus={vi.fn()} />);

    expect(screen.getByText("Email tidak diisi")).toBeInTheDocument();
  });

  it("renders the status action buttons", () => {
    const order = makeOrder();
    render(<OrderDetail order={order} savingId="" onUpdateStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Tandai selesai/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Batalkan pesanan/ })).toBeInTheDocument();
  });
});
