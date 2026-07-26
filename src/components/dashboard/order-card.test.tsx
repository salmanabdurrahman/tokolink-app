import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderCard } from "./order-card";
import { makePrismaOrder } from "@/test/factories";
import type { TenantOrder } from "@/lib/types";

function makeOrder(overrides: Record<string, unknown> = {}) {
  return makePrismaOrder({
    courier: "jne",
    shippingService: "REG",
    trackingNumber: "",
    status: "PAID",
    items: [
      { id: "item-1", productName: "Kopi Susu", qty: 1, unitPrice: 10000, totalPrice: 10000 },
    ],
    ...overrides,
  }) as unknown as TenantOrder;
}

describe("OrderCard", () => {
  it("renders order summary and item count", () => {
    const order = makeOrder();
    render(
      <OrderCard
        order={order}
        onSelect={vi.fn()}
        trackingForm={{ courier: "jne", trackingNumber: "" }}
        savingId=""
        onTrackingChange={vi.fn()}
        onTrackingSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("TL202501010001")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("calls onSelect when the order header is clicked", () => {
    const onSelect = vi.fn();
    const order = makeOrder();
    render(
      <OrderCard
        order={order}
        onSelect={onSelect}
        trackingForm={{ courier: "jne", trackingNumber: "" }}
        savingId=""
        onTrackingChange={vi.fn()}
        onTrackingSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("TL202501010001"));

    expect(onSelect).toHaveBeenCalledWith(order.id);
  });

  it("disables tracking form when order status does not allow updates", () => {
    const order = makeOrder({ status: "PENDING_PAYMENT" });
    render(
      <OrderCard
        order={order}
        onSelect={vi.fn()}
        trackingForm={{ courier: "jne", trackingNumber: "" }}
        savingId=""
        onTrackingChange={vi.fn()}
        onTrackingSubmit={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Masukkan resi setelah dikirim")).toBeDisabled();
  });

  it("calls onTrackingSubmit when tracking form is submitted", () => {
    const onTrackingSubmit = vi.fn();
    const order = makeOrder();
    render(
      <OrderCard
        order={order}
        onSelect={vi.fn()}
        trackingForm={{ courier: "jne", trackingNumber: "RESI123" }}
        savingId=""
        onTrackingChange={vi.fn()}
        onTrackingSubmit={onTrackingSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Simpan resi/ }));

    expect(onTrackingSubmit).toHaveBeenCalledWith(order, {
      courier: "jne",
      trackingNumber: "RESI123",
    });
  });
});
