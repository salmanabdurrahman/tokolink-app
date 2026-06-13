import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";

interface DeleteConfirmModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ product, onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal open={true} onClose={onClose}>
      <h3 className="font-display text-xl font-medium text-foreground">Hapus produk?</h3>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Apakah Anda yakin ingin menghapus produk{" "}
        <strong className="text-foreground">{product.name}</strong>? Tindakan ini tidak dapat
        dibatalkan.
      </p>
      <div className="mt-6 flex justify-end gap-2 text-xs">
        <Button variant="outline" size="sm" onClick={onClose}>
          Batal
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm}>
          Hapus
        </Button>
      </div>
    </Modal>
  );
}
