import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductCard({ product, categoryName, onEdit, onDelete }: ProductCardProps) {
  const isSoldOut = product.trackStock && (product.stock ?? 0) <= 0;

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
          {isSoldOut && (
            <Badge variant="destructive" className="absolute left-2 top-2 bg-background">
              Stok habis
            </Badge>
          )}
        </div>
        <div className="p-4">
          {categoryName && (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {categoryName}
            </div>
          )}
          <div className="font-display text-base font-medium text-foreground">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>
          {product.trackStock && (
            <div className="mt-1 text-xs text-muted-foreground">Stok: {product.stock ?? 0}</div>
          )}
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
