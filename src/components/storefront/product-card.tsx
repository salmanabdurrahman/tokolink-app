import { motion } from "framer-motion";
import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import { useCart } from "@/lib/store";
import type { Product } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
  delay?: number;
  onSelect: () => void;
}

export function ProductCard({ product, delay = 0, onSelect }: ProductCardProps) {
  const add = useCart((s) => s.add);
  const hasVariants = product.variantGroups && product.variantGroups.length > 0;

  const handleAdd = () => {
    if (hasVariants) {
      onSelect();
    } else {
      add({
        key: product.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.basePrice,
        qty: 1,
        image: product.image,
      });
      toast.success(`"${product.name}" ditambahkan ke keranjang`);
    }
  };

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between"
    >
      <div className="aspect-square overflow-hidden bg-secondary relative">
        <FallbackImage
          src={product.image}
          alt={product.name}
          fallbackText={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-sm font-medium leading-snug">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>
        </div>
        <Button onClick={handleAdd} size="sm" className="mt-3 w-full active:scale-[0.97]">
          + Keranjang
        </Button>
      </div>
    </motion.div>
  );
}
