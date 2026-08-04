import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package } from "lucide-react";

type ProductInfo = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  stock: number | null;
};

export type ProductInfoDialogProps = {
  /** raw scanned value (product id or product name) */
  value: string | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Looks up a product by scanned barcode/QR value (matches by id first,
 * falls back to a case-insensitive name match) and shows its details.
 */
export function ProductInfoDialog({ value, onOpenChange }: ProductInfoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!value) {
      setProduct(null);
      setNotFound(false);
      return;
    }
    let cancelled = false;
    async function lookup() {
      setLoading(true);
      setNotFound(false);
      setProduct(null);
      try {
        const raw = value.trim();
        let found: ProductInfo | null = null;

        const byId = await supabase
          .from("products")
          .select("id, name, description, image_url, price, stock")
          .eq("id", raw)
          .maybeSingle();
        if (byId.data) found = byId.data as ProductInfo;

        if (!found) {
          const byName = await supabase
            .from("products")
            .select("id, name, description, image_url, price, stock")
            .ilike("name", raw)
            .maybeSingle();
          if (byName.data) found = byName.data as ProductInfo;
        }

        if (!cancelled) {
          if (found) setProduct(found);
          else setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    lookup();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <Dialog open={!!value} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" /> ข้อมูลสินค้า
          </DialogTitle>
          <DialogDescription>ผลลัพธ์จากการสแกนบาร์โค้ด/คิวอาร์สินค้า</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground text-center py-6">กำลังค้นหาสินค้า...</p>}

        {!loading && notFound && (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่พบสินค้าที่ตรงกับโค้ดนี้</p>
        )}

        {!loading && product && (
          <div className="space-y-3">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full aspect-square object-cover rounded-md border"
              />
            )}
            <h3 className="font-semibold text-lg">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">ราคา</span>
              <span className="font-semibold text-primary">฿{Number(product.price).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">คงเหลือ</span>
              <span className="font-semibold">{product.stock ?? "-"}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProductInfoDialog;
