import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

interface CheckoutActionsProps {
  totalPrice: number;
  shippingCost: number;
  loading: boolean;
  hasWhatsApp: boolean;
  onCheckoutPakasir: () => void;
  onCheckoutWhatsApp: () => void;
  onClear: () => void;
}

export function CheckoutActions({
  totalPrice,
  shippingCost,
  loading,
  hasWhatsApp,
  onCheckoutPakasir,
  onCheckoutWhatsApp,
  onClear,
}: CheckoutActionsProps) {
  return (
    <>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 shrink-0">
        <span className="text-sm text-muted-foreground">Total + ongkir</span>
        <span className="font-display text-2xl font-medium">
          {formatIDR(totalPrice + (Number(shippingCost) || 0))}
        </span>
      </div>

      <Button
        onClick={onCheckoutPakasir}
        variant="accent"
        disabled={loading}
        className="mt-4 w-full shrink-0 py-4"
      >
        {loading ? "Membuat order..." : "Bayar via Pakasir →"}
      </Button>
      {hasWhatsApp ? (
        <Button onClick={onCheckoutWhatsApp} variant="outline" className="mt-3 w-full shrink-0">
          Chat WhatsApp →
        </Button>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
          Nomor WhatsApp toko belum diisi. Owner perlu melengkapi nomor WhatsApp di dashboard.
        </div>
      )}
      <button
        onClick={onClear}
        className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition shrink-0 cursor-pointer"
      >
        Kosongkan keranjang
      </button>
    </>
  );
}
