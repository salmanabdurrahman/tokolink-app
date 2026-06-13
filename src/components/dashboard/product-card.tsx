import { Button } from "@/components/ui/button";
import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <li className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between">
      <div>
        <div className="aspect-square overflow-hidden bg-secondary relative">
          <FallbackImage
            src={product.image}
            alt={product.name}
            fallbackText={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <div className="font-display text-base font-medium text-foreground">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>

          {/* Variant groups display */}
          {product.variantGroups && product.variantGroups.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              {product.variantGroups.map((g) => (
                <div key={g.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{g.name}</span>:{" "}
                  {g.options.map((o) => o.name).join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="p-4 pt-0">
        <div className="flex gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            Hapus
          </Button>
        </div>
      </div>
    </li>
  );
}
