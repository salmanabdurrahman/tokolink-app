import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OrderTrackingForm } from "./order-tracking-form";

describe("OrderTrackingForm", () => {
  it("calls onChange when courier or tracking number is edited", () => {
    const onChange = vi.fn();
    render(
      <OrderTrackingForm
        value={{ courier: "jne", trackingNumber: "" }}
        canUpdateTracking={true}
        saving={false}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Masukkan resi setelah dikirim"), {
      target: { value: "RESI123" },
    });

    expect(onChange).toHaveBeenCalledWith({ courier: "jne", trackingNumber: "RESI123" });
  });

  it("disables inputs and submit button when tracking cannot be updated", () => {
    render(
      <OrderTrackingForm
        value={{ courier: "jne", trackingNumber: "" }}
        canUpdateTracking={false}
        saving={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Masukkan resi setelah dikirim")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Simpan resi/ })).toBeDisabled();
  });

  it("shows saving label and calls onSubmit", () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <OrderTrackingForm
        value={{ courier: "jne", trackingNumber: "RESI123" }}
        canUpdateTracking={true}
        saving={true}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
  });
});
