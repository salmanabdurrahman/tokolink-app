import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderFilterBar } from "./order-filter-bar";

describe("OrderFilterBar", () => {
  it("calls onStatusChange when status filter changes", () => {
    const onStatusChange = vi.fn();
    render(
      <OrderFilterBar
        statusFilter="ALL"
        paymentFilter="ALL"
        shippingFilter="ALL"
        onStatusChange={onStatusChange}
        onPaymentChange={vi.fn()}
        onShippingChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Status order"), { target: { value: "PAID" } });

    expect(onStatusChange).toHaveBeenCalledWith("PAID");
  });

  it("calls onPaymentChange when payment filter changes", () => {
    const onPaymentChange = vi.fn();
    render(
      <OrderFilterBar
        statusFilter="ALL"
        paymentFilter="ALL"
        shippingFilter="ALL"
        onStatusChange={vi.fn()}
        onPaymentChange={onPaymentChange}
        onShippingChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Pembayaran"), { target: { value: "FAILED" } });

    expect(onPaymentChange).toHaveBeenCalledWith("FAILED");
  });

  it("calls onShippingChange when shipping filter changes", () => {
    const onShippingChange = vi.fn();
    render(
      <OrderFilterBar
        statusFilter="ALL"
        paymentFilter="ALL"
        shippingFilter="ALL"
        onStatusChange={vi.fn()}
        onPaymentChange={vi.fn()}
        onShippingChange={onShippingChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Pengiriman"), { target: { value: "WITH_TRACKING" } });

    expect(onShippingChange).toHaveBeenCalledWith("WITH_TRACKING");
  });
});
