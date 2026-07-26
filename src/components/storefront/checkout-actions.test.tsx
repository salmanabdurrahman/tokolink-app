import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckoutActions } from "./checkout-actions";

describe("CheckoutActions", () => {
  it("shows total price plus shipping cost", () => {
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={false}
        hasWhatsApp={true}
        onCheckoutPakasir={vi.fn()}
        onCheckoutWhatsApp={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("Rp 25.000")).toBeInTheDocument();
  });

  it("calls onCheckoutPakasir when the pay button is clicked", () => {
    const onCheckoutPakasir = vi.fn();
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={false}
        hasWhatsApp={true}
        onCheckoutPakasir={onCheckoutPakasir}
        onCheckoutWhatsApp={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bayar via Pakasir →" }));

    expect(onCheckoutPakasir).toHaveBeenCalled();
  });

  it("shows loading label and disables pay button while loading", () => {
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={true}
        hasWhatsApp={true}
        onCheckoutPakasir={vi.fn()}
        onCheckoutWhatsApp={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Membuat order..." })).toBeDisabled();
  });

  it("shows WhatsApp button when hasWhatsApp is true", () => {
    const onCheckoutWhatsApp = vi.fn();
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={false}
        hasWhatsApp={true}
        onCheckoutPakasir={vi.fn()}
        onCheckoutWhatsApp={onCheckoutWhatsApp}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Chat WhatsApp →" }));

    expect(onCheckoutWhatsApp).toHaveBeenCalled();
  });

  it("shows fallback message when hasWhatsApp is false", () => {
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={false}
        hasWhatsApp={false}
        onCheckoutPakasir={vi.fn()}
        onCheckoutWhatsApp={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nomor WhatsApp toko belum diisi/)).toBeInTheDocument();
  });

  it("calls onClear when 'Kosongkan keranjang' is clicked", () => {
    const onClear = vi.fn();
    render(
      <CheckoutActions
        totalPrice={20000}
        shippingCost={5000}
        loading={false}
        hasWhatsApp={true}
        onCheckoutPakasir={vi.fn()}
        onCheckoutWhatsApp={vi.fn()}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kosongkan keranjang" }));

    expect(onClear).toHaveBeenCalled();
  });
});
