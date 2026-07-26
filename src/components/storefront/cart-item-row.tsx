import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import type { CartItem } from "@/lib/types";

interface CartItemRowProps {
  item: CartItem;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
}

export function CartItemRow({ item, onInc, onDec }: CartItemRowProps) {
  return (
    <li className="flex items-center gap-3 py-3">
      <FallbackImage
        src={item.image}
        alt={item.productName}
        fallbackText={item.productName}
        className="h-14 w-14 rounded-xl object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.productName}</div>
        {item.variantName && (
          <div className="text-xs text-muted-foreground truncate">{item.variantName}</div>
        )}
        <div className="text-xs text-muted-foreground">{formatIDR(item.unitPrice)}</div>
      </div>
      <div className="flex items-center gap-2 text-sm shrink-0">
        <button
          aria-label={`Kurangi ${item.productName}`}
          onClick={() => onDec(item.key)}
          className="h-8 w-8 rounded-full border border-border hover:bg-surface transition cursor-pointer"
        >
          −
        </button>
        <span className="min-w-6 text-center font-semibold">{item.qty}</span>
        <button
          aria-label={`Tambah ${item.productName}`}
          onClick={() => onInc(item.key)}
          className="h-8 w-8 rounded-full border border-border bg-surface hover:bg-muted transition cursor-pointer"
        >
          +
        </button>
      </div>
    </li>
  );
}
