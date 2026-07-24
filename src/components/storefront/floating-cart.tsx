import { motion } from "framer-motion";
import { useState } from "react";
import { useCart, buildWhatsAppUrl } from "@/lib/store";
import { formatIDR } from "@/lib/utils";
import { FallbackImage } from "@/components/fallback-image";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FloatingCartProps {
  tenantSlug: string;
  storeName: string;
  phone: string;
}

export function FloatingCart({ tenantSlug, storeName, phone }: FloatingCartProps) {
  const items = useCart((s) => s.items);
  const totalQty = useCart((s) => s.totalQty());
  const totalPrice = useCart((s) => s.totalPrice());
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const clear = useCart((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", whatsapp: "", address: "" });
  const [shipping, setShipping] = useState({ courier: "jne", service: "REG", etd: "", cost: 0 });

  if (totalQty === 0) return null;

  const checkoutWhatsApp = () => {
    const url = buildWhatsAppUrl(phone, storeName, items, totalPrice, note);
    window.open(url, "_blank");
    toast.success("Mengarahkan ke WhatsApp...");
  };

  const checkoutPakasir = async () => {
    try {
      setLoading(true);
      const { createCheckoutOrder } = await import("@/server/order.functions");
      const result = await createCheckoutOrder({
        data: {
          tenantSlug,
          items: items.map((item) => ({
            productId: item.productId,
            variantOptionIds: item.variantId ? item.variantId.split(",") : [],
            qty: item.qty,
          })),
          customer,
          shipping: { ...shipping, cost: Number(shipping.cost) || 0 },
        },
      });
      toast.success("Order dibuat. Mengarahkan ke pembayaran...");
      clear();
      setNote("");
      window.location.href = result.paymentUrl;
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

        <ul className="mt-4 divide-y divide-border overflow-y-auto flex-1 pr-1 hide-scrollbar">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 py-3">
              <FallbackImage
                src={i.image}
                alt={i.productName}
                fallbackText={i.productName}
                className="h-14 w-14 rounded-lg object-cover"
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
                  onClick={() => dec(i.key)}
                  className="h-7 w-7 rounded-full border border-border hover:bg-surface transition cursor-pointer"
                >
                  −
                </button>
                <span className="w-4 text-center font-medium">{i.qty}</span>
                <button
                  onClick={() => inc(i.key)}
                  className="h-7 w-7 rounded-full border border-border hover:bg-surface transition cursor-pointer"
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
            onChange={(e) => setCustomer((value) => ({ ...value, whatsapp: e.target.value }))}
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
        <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
          <Input
            value={shipping.courier}
            onChange={(e) => setShipping((value) => ({ ...value, courier: e.target.value }))}
            placeholder="Kurir"
          />
          <Input
            value={shipping.service}
            onChange={(e) => setShipping((value) => ({ ...value, service: e.target.value }))}
            placeholder="Layanan"
          />
          <Input
            value={shipping.etd}
            onChange={(e) => setShipping((value) => ({ ...value, etd: e.target.value }))}
            placeholder="Estimasi"
          />
          <Input
            type="number"
            value={shipping.cost}
            onChange={(e) => setShipping((value) => ({ ...value, cost: Number(e.target.value) }))}
            placeholder="Ongkir"
          />
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
        <Button onClick={checkoutWhatsApp} variant="outline" className="mt-3 w-full shrink-0">
          Chat WhatsApp →
        </Button>
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
