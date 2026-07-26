import { useState } from "react";
import { toast } from "sonner";
import type { CartItem } from "@/lib/types";
import type { RajaOngkirLocationValue } from "@/components/shipping/rajaongkir-location-picker";

export type Destination = RajaOngkirLocationValue;

export type ShippingOption = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export type SelectedShipping = {
  courier: string;
  service: string;
  etd: string;
  cost: number;
};

interface UseShippingQuoteOptions {
  tenantSlug: string;
  items: CartItem[];
}

export function useShippingQuote({ tenantSlug, items }: UseShippingQuoteOptions) {
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shipping, setShipping] = useState<SelectedShipping>({
    courier: "",
    service: "",
    etd: "",
    cost: 0,
  });

  const loadShippingCosts = async (destination: Destination) => {
    try {
      setSelectedDestination(destination);
      setShipping({ courier: "", service: "", etd: "", cost: 0 });
      setShippingOptions([]);
      setLoadingShipping(true);
      const response = await fetch("/api/shipping/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          destinationId: destination.id,
          items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Ongkir belum tersedia");
      setShippingOptions(result.options);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ongkir belum tersedia");
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleDestinationChange = (destination: Destination | null) => {
    if (!destination) {
      setSelectedDestination(null);
      setShipping({ courier: "", service: "", etd: "", cost: 0 });
      setShippingOptions([]);
      return;
    }
    loadShippingCosts(destination);
  };

  const selectShipping = (option: ShippingOption) => {
    setShipping({
      courier: option.courier,
      service: option.service,
      etd: option.etd,
      cost: option.cost,
    });
  };

  return {
    loadingShipping,
    selectedDestination,
    shippingOptions,
    shipping,
    handleDestinationChange,
    selectShipping,
  };
}
