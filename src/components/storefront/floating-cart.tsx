import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCart, buildWhatsAppUrl } from "@/lib/store";
import { formatIDR, formatWhatsAppNumber } from "@/lib/utils";
import { FallbackImage } from "@/components/fallback-image";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Destination = {
  id: string;
  label: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  zipCode: string;
};

type ShippingOption = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

interface FloatingCartProps {
  tenantSlug: string;
  storeName: string;
  phone: string;
  whatsappTemplate?: string;
}

export function FloatingCart({
  tenantSlug,
  storeName,
  phone,
  whatsappTemplate,
}: FloatingCartProps) {
  const items = useCart((s) => s.items);
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [items],
  );
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const clear = useCart((s) => s.clear);
  const setTenantSlug = useCart((s) => s.setTenantSlug);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [customer, setCustomer] = useState({ name: "", email: "", whatsapp: "", address: "" });
  const [shipping, setShipping] = useState({ courier: "", service: "", etd: "", cost: 0 });

  useEffect(() => {
    setTenantSlug(tenantSlug);
  }, [setTenantSlug, tenantSlug]);

  if (totalQty === 0) return null;

  const formattedPhone = formatWhatsAppNumber(phone);
  const hasWhatsApp = /^62\d{9,15}$/.test(formattedPhone);

  const checkoutWhatsApp = () => {
    if (!hasWhatsApp) {
      toast.error("Nomor WhatsApp toko belum tersedia");
      return;
    }
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

  const searchDestination = async () => {
    try {
      setSearchingDestination(true);
      const response = await fetch("/api/shipping/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: destinationQuery, limit: 5 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Gagal mencari lokasi");
      setDestinations(result);
      if (!result.length) toast.error("Lokasi tidak ditemukan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari lokasi");
    } finally {
      setSearchingDestination(false);
    }
  };

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

  const selectShipping = (option: ShippingOption) => {
    setShipping({
      courier: option.courier,
      service: option.service,
      etd: option.etd,
      cost: option.cost,
    });
  };

  const checkoutPakasir = async () => {
    if (!selectedDestination || !shipping.cost) {
      toast.error("Pilih tujuan dan layanan pengiriman dulu");
      return;
    }

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
      clear();
      setNote("");
      if (!result.paymentUrl) throw new Error("Link pembayaran tidak tersedia");
      window.location.assign(result.paymentUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground p-2 pl-5 text-background shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition duration-200 cursor-pointer"
      >
        <span className="text-sm">
          <span className="font-medium">{totalQty} item</span>
          <span className="mx-2 opacity-40">·</span>
          <span>{formatIDR(totalPrice)}</span>
        </span>
        <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground">
          Lihat keranjang →
        </span>
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h3 className="font-display text-2xl font-medium shrink-0">Keranjang</h3>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 hide-scrollbar">
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 py-3">
                <FallbackImage
                  src={i.image}
                  alt={i.productName}
                  fallbackText={i.productName}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.productName}</div>
                  {i.variantName && (
                    <div className="text-xs text-muted-foreground truncate">{i.variantName}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{formatIDR(i.unitPrice)}</div>
                </div>
                <div className="flex items-center gap-2 text-sm shrink-0">
                  <button
                    aria-label={`Kurangi ${i.productName}`}
                    onClick={() => dec(i.key)}
                    className="h-8 w-8 rounded-full border border-border hover:bg-surface transition cursor-pointer"
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center font-semibold">{i.qty}</span>
                  <button
                    aria-label={`Tambah ${i.productName}`}
                    onClick={() => inc(i.key)}
                    className="h-8 w-8 rounded-full border border-border bg-surface hover:bg-muted transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 shrink-0">
            <Label>Data pembeli</Label>
            <Input
              value={customer.name}
              onChange={(e) => setCustomer((value) => ({ ...value, name: e.target.value }))}
              placeholder="Nama lengkap"
            />
            <Input
              value={customer.whatsapp}
              onChange={(e) =>
                setCustomer((value) => ({
                  ...value,
                  whatsapp: formatWhatsAppNumber(e.target.value),
                }))
              }
              placeholder="WhatsApp, contoh 628123456789"
            />
            <Input
              value={customer.email}
              onChange={(e) => setCustomer((value) => ({ ...value, email: e.target.value }))}
              placeholder="Email receipt (opsional)"
            />
            <Textarea
              value={customer.address}
              onChange={(e) => setCustomer((value) => ({ ...value, address: e.target.value }))}
              placeholder="Alamat pengiriman"
              rows={2}
            />
          </div>
          <div className="mt-4 space-y-3 shrink-0">
            <Label>Tujuan pengiriman</Label>
            <div className="flex gap-2">
              <Input
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                placeholder="Cari kecamatan/kelurahan"
              />
              <Button
                type="button"
                variant="outline"
                disabled={searchingDestination}
                onClick={searchDestination}
              >
                {searchingDestination ? "Cari..." : "Cari"}
              </Button>
            </div>
            {destinations.length > 0 && (
              <div className="space-y-2">
                {destinations.map((destination) => (
                  <button
                    key={destination.id}
                    type="button"
                    onClick={() => loadShippingCosts(destination)}
                    className="w-full rounded-xl border border-border p-3 text-left text-sm hover:bg-surface transition"
                  >
                    {destination.label}
                  </button>
                ))}
              </div>
            )}
            {loadingShipping && (
              <p className="text-xs text-muted-foreground">Menghitung ongkir...</p>
            )}
            {shippingOptions.length > 0 && (
              <div className="grid gap-2">
                {shippingOptions.map((option) => (
                  <button
                    key={`${option.courier}-${option.service}-${option.cost}`}
                    type="button"
                    onClick={() => selectShipping(option)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${shipping.courier === option.courier && shipping.service === option.service ? "border-foreground bg-surface" : "border-border hover:bg-surface"}`}
                  >
                    <span className="font-medium uppercase">
                      {option.courier} {option.service}
                    </span>
                    <span className="ml-2 text-muted-foreground">{option.etd}</span>
                    <span className="float-right font-medium">{formatIDR(option.cost)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 space-y-1.5 shrink-0">
            <Label htmlFor="order-note">Catatan WhatsApp (opsional)</Label>
            <Textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Titip di pos satpam, request gilingan kasar, dll."
              rows={2}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 shrink-0">
          <span className="text-sm text-muted-foreground">Total + ongkir</span>
          <span className="font-display text-2xl font-medium">
            {formatIDR(totalPrice + (Number(shipping.cost) || 0))}
          </span>
        </div>

        <Button
          onClick={checkoutPakasir}
          variant="accent"
          disabled={loading}
          className="mt-4 w-full shrink-0 py-4"
        >
          {loading ? "Membuat order..." : "Bayar via Pakasir →"}
        </Button>
        {hasWhatsApp ? (
          <Button onClick={checkoutWhatsApp} variant="outline" className="mt-3 w-full shrink-0">
            Chat WhatsApp →
          </Button>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
            Nomor WhatsApp toko belum diisi. Owner perlu melengkapi nomor WhatsApp di dashboard.
          </div>
        )}
        <button
          onClick={() => clear()}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition shrink-0 cursor-pointer"
        >
          Kosongkan keranjang
        </button>
      </Sheet>
    </>
  );
}
