import { useState } from "react";
import { toast } from "sonner";
import { buildWhatsAppUrl } from "@/lib/store";
import { trackEvent } from "@/lib/analytics";
import { formatWhatsAppNumber, isValidWhatsAppNumber } from "@/lib/utils";
import type { CartItem } from "@/lib/types";
import type { Destination, SelectedShipping } from "@/hooks/use-shipping-quote";

interface UseCheckoutFlowOptions {
  tenantSlug: string;
  storeName: string;
  phone: string;
  whatsappTemplate?: string;
  items: CartItem[];
  totalPrice: number;
  selectedDestination: Destination | null;
  shipping: SelectedShipping;
  onOrderCreated: () => void;
}

export function useCheckoutFlow({
  tenantSlug,
  storeName,
  phone,
  whatsappTemplate,
  items,
  totalPrice,
  selectedDestination,
  shipping,
  onOrderCreated,
}: UseCheckoutFlowOptions) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", whatsapp: "", address: "" });

  const formattedPhone = formatWhatsAppNumber(phone);
  const hasWhatsApp = isValidWhatsAppNumber(formattedPhone);

  const checkoutWhatsApp = () => {
    if (!hasWhatsApp) {
      toast.error("Nomor WhatsApp toko belum tersedia");
      return;
    }
    trackEvent("whatsapp_click", { tenantSlug });
    const url = buildWhatsAppUrl(
      formattedPhone,
      storeName,
      items,
      totalPrice,
      note,
      whatsappTemplate,
    );
    toast.success("Mengarahkan ke WhatsApp...");
    window.location.assign(url);
  };

  const checkoutPakasir = async () => {
    if (!selectedDestination || !shipping.cost) {
      toast.error("Pilih tujuan dan layanan pengiriman dulu");
      return;
    }

    trackEvent("checkout_started", { tenantSlug });
    try {
      setLoading(true);
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          items: items.map((item) => ({
            productId: item.productId,
            variantOptionIds: item.variantId ? item.variantId.split(",") : [],
            qty: item.qty,
          })),
          customer: {
            ...customer,
            province: selectedDestination.provinceName,
            city: selectedDestination.cityName,
            district: selectedDestination.districtName || selectedDestination.subdistrictName,
            postalCode: selectedDestination.zipCode,
            rajaOngkirDestinationId: selectedDestination.id,
            rajaOngkirDestinationLabel: selectedDestination.label,
          },
          shipping,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Checkout gagal. Coba lagi.");
      toast.success("Order dibuat. Mengarahkan ke pembayaran...");
      onOrderCreated();
      setNote("");
      if (!result.paymentUrl) throw new Error("Link pembayaran tidak tersedia");
      window.location.assign(result.paymentUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return {
    note,
    setNote,
    customer,
    setCustomer,
    loading,
    hasWhatsApp,
    checkoutWhatsApp,
    checkoutPakasir,
  };
}
