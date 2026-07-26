import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shipping/rajaongkir-location-picker", () => ({
  RajaOngkirLocationPicker: () => <div data-testid="location-picker" />,
}));

import { ShippingOriginPicker } from "./shipping-origin-picker";

describe("ShippingOriginPicker", () => {
  it("shows incomplete warning when origin address and location are empty", () => {
    render(
      <ShippingOriginPicker
        originAddress=""
        onOriginAddressChange={vi.fn()}
        rajaOngkirOriginId=""
        rajaOngkirOriginLabel=""
        onOriginChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/belum lengkap/)).toBeInTheDocument();
  });

  it("hides incomplete warning once origin address is filled", () => {
    render(
      <ShippingOriginPicker
        originAddress="Jl. Melati 1"
        onOriginAddressChange={vi.fn()}
        rajaOngkirOriginId=""
        rajaOngkirOriginLabel=""
        onOriginChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(/belum lengkap/)).not.toBeInTheDocument();
  });

  it("calls onOriginAddressChange when address input changes", () => {
    const onOriginAddressChange = vi.fn();
    render(
      <ShippingOriginPicker
        originAddress=""
        onOriginAddressChange={onOriginAddressChange}
        rajaOngkirOriginId=""
        rajaOngkirOriginLabel=""
        onOriginChange={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText("Contoh: Jl. Melati No. 1, dekat Pasar Karawang"),
      {
        target: { value: "Jl. Melati 1" },
      },
    );

    expect(onOriginAddressChange).toHaveBeenCalledWith("Jl. Melati 1");
  });
});
