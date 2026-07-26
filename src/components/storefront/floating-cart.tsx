import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/store";
import { formatIDR } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useShippingQuote } from "@/hooks/use-shipping-quote";
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";
import { CartItemRow } from "@/components/storefront/cart-item-row";
import { CustomerForm } from "@/components/storefront/customer-form";
import { ShippingPicker } from "@/components/storefront/shipping-picker";
import { CheckoutActions } from "@/components/storefront/checkout-actions";

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

  const {
    loadingShipping,
    selectedDestination,
    shippingOptions,
    shipping,
    handleDestinationChange,
    selectShipping,
  } = useShippingQuote({ tenantSlug, items });

  const {
    note,
    setNote,
    customer,
    setCustomer,
    errors,
    loading,
    hasWhatsApp,
    checkoutWhatsApp,
    checkoutPakasir,
  } = useCheckoutFlow({
    tenantSlug,
    storeName,
    phone,
    whatsappTemplate,
    items,
    totalPrice,
    selectedDestination,
    shipping,
    onOrderCreated: clear,
  });

  useEffect(() => {
    setTenantSlug(tenantSlug);
  }, [setTenantSlug, tenantSlug]);

  if (totalQty === 0) return null;

  return (
    <>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground p-2 pl-5 text-background shadow-2xl hover:scale-[1.01] transition duration-200 cursor-pointer"
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

      <Sheet open={open} onClose={() => setOpen(false)} titleId="cart-sheet-title">
        <h3 id="cart-sheet-title" className="font-display text-2xl font-medium shrink-0">
          Keranjang
        </h3>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 hide-scrollbar">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <CartItemRow key={item.key} item={item} onInc={inc} onDec={dec} />
            ))}
          </ul>

          <CustomerForm value={customer} onChange={setCustomer} errors={errors} />

          <ShippingPicker
            selectedDestination={selectedDestination}
            onDestinationChange={handleDestinationChange}
            loadingShipping={loadingShipping}
            shippingOptions={shippingOptions}
            shipping={shipping}
            onSelectShipping={selectShipping}
          />

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

        <CheckoutActions
          totalPrice={totalPrice}
          shippingCost={shipping.cost}
          loading={loading}
          hasWhatsApp={hasWhatsApp}
          onCheckoutPakasir={checkoutPakasir}
          onCheckoutWhatsApp={checkoutWhatsApp}
          onClear={clear}
        />
      </Sheet>
    </>
  );
}
