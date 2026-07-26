import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderStatusActions } from "./order-status-actions";
import { makePrismaOrder } from "@/test/factories";
import type { TenantOrder } from "@/lib/types";

function makeOrder(overrides: Record<string, unknown> = {}) {
  return makePrismaOrder(overrides) as unknown as TenantOrder;
}

describe("OrderStatusActions", () => {
  it("enables 'Tandai selesai' only when order is SHIPPED", () => {
    const order = makeOrder({ status: "SHIPPED" });
    render(<OrderStatusActions order={order} savingId="" onUpdateStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Tandai selesai/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Batalkan pesanan/ })).toBeDisabled();
  });

  it("enables 'Batalkan pesanan' only when order is PENDING_PAYMENT", () => {
    const order = makeOrder({ status: "PENDING_PAYMENT" });
    render(<OrderStatusActions order={order} savingId="" onUpdateStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Batalkan pesanan/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Tandai selesai/ })).toBeDisabled();
  });

  it("calls onUpdateStatus with COMPLETED when clicked", () => {
    const onUpdateStatus = vi.fn();
    const order = makeOrder({ status: "SHIPPED" });
    render(<OrderStatusActions order={order} savingId="" onUpdateStatus={onUpdateStatus} />);

    fireEvent.click(screen.getByRole("button", { name: /Tandai selesai/ }));

    expect(onUpdateStatus).toHaveBeenCalledWith(order.id, "COMPLETED");
  });

  it("disables both actions while saving", () => {
    const order = makeOrder({ status: "SHIPPED" });
    render(<OrderStatusActions order={order} savingId={order.id} onUpdateStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Tandai selesai/ })).toBeDisabled();
  });
});
