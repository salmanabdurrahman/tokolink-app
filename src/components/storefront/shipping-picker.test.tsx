import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shipping/rajaongkir-location-picker", () => ({
  RajaOngkirLocationPicker: () => <div data-testid="location-picker" />,
}));

import { ShippingPicker } from "./shipping-picker";
import type { ShippingOption } from "@/hooks/use-shipping-quote";

const options: ShippingOption[] = [
  { courier: "jne", service: "REG", description: "Regular", cost: 12000, etd: "1-2" },
  { courier: "jnt", service: "EZ", description: "Ekonomis", cost: 9000, etd: "2-4" },
];

describe("ShippingPicker", () => {
  it("shows loading message while fetching shipping cost", () => {
    render(
      <ShippingPicker
        selectedDestination={null}
        onDestinationChange={vi.fn()}
        loadingShipping={true}
        shippingOptions={[]}
        shipping={{ courier: "", service: "", etd: "", cost: 0 }}
        onSelectShipping={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sedang menghitung ongkir/)).toBeInTheDocument();
  });

  it("renders shipping options with cost and etd", () => {
    render(
      <ShippingPicker
        selectedDestination={null}
        onDestinationChange={vi.fn()}
        loadingShipping={false}
        shippingOptions={options}
        shipping={{ courier: "", service: "", etd: "", cost: 0 }}
        onSelectShipping={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /jne REG/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jnt EZ/i })).toBeInTheDocument();
  });

  it("calls onSelectShipping when an option is clicked", () => {
    const onSelectShipping = vi.fn();
    render(
      <ShippingPicker
        selectedDestination={null}
        onDestinationChange={vi.fn()}
        loadingShipping={false}
        shippingOptions={options}
        shipping={{ courier: "", service: "", etd: "", cost: 0 }}
        onSelectShipping={onSelectShipping}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /jne REG/i }));

    expect(onSelectShipping).toHaveBeenCalledWith(options[0]);
  });
});
