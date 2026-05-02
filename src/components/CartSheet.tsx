import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, Receipt } from "lucide-react";
import {
  fetchCart,
  removeCartItem,
  updateQty,
  clearCart,
  checkoutCart,
  ADMIN_CHAT_URL,
  type CartItem,
} from "@/lib/cart";
import { getUser } from "@/lib/auth";
import { toast } from "sonner";

export function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [receipt, setReceipt] = useState<{ items: CartItem[]; total: number; code: string } | null>(null);

  async function load() {
    const u = getUser();
    if (!u) return setItems([]);
    setItems(await fetchCart(u.id));
  }

  useEffect(() => {
    if (open) load();
    const onChange = () => open && load();
    window.addEventListener("cart-change", onChange);
    return () => window.removeEventListener("cart-change", onChange);
  }, [open]);

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const visible = showAll ? items : items.slice(0, 5);

  async function doCheckout() {
    const u = getUser();
    if (!u || items.length === 0) return;
    try {
      const result = await checkoutCart(u.id, items);
      setReceipt({ items: [...items], total, code: result.receipt_code });
      await clearCart(u.id);
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    }
  }

  function contactAdmin() {
    window.open(ADMIN_CHAT_URL, "_blank", "noopener,noreferrer");
    setReceipt(null);
    onOpenChange(false);
  }

  function cancelOrder() {
    setReceipt(null);
    toast("ยกเลิกคำสั่งซื้อแล้ว");
  }

  const u = getUser();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-gradient-gold">
            ตะกร้าสินค้า
          </SheetTitle>
        </SheetHeader>

        {!u ? (
          <div className="text-sm text-muted-foreground py-12 text-center">
            กรุณาเข้าสู่ระบบเพื่อใช้งานตะกร้า
          </div>
        ) : receipt ? (
          <div className="flex-1 overflow-auto mt-4 px-1">
            <div className="border border-gold/40 rounded-lg p-5 bg-gradient-card">
              <div className="text-center font-display text-xl text-gold mb-1">
                <Receipt className="inline w-5 h-5 mr-1" /> Prokim
              </div>
              <div className="text-center text-xs text-muted-foreground mb-4">
                {new Date().toLocaleString("th-TH")}
              </div>
              <div className="border-t border-dashed border-border my-2" />
              <div className="space-y-1 text-sm">
                {receipt.items.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>฿{(i.unit_price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-gold">฿{receipt.total.toFixed(2)}</span>
              </div>
              <div className="border-t border-dashed border-border my-2" />
              <p className="text-center text-xs text-muted-foreground">
                * กรุณาแคปหน้านี้ส่งให้แอดมิน
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={contactAdmin} variant="luxe" className="flex-1">
                ทักแชทแอดมิน
              </Button>
              <Button onClick={cancelOrder} variant="outline" className="flex-1">
                ยกเลิกคำสั่งซื้อ
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">ตะกร้าว่างเปล่า</div>
        ) : (
          <>
            <div className="flex-1 overflow-auto mt-4 space-y-2 pr-1">
              {visible.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.product_name}</div>
                    <div className="text-sm text-gold">฿{i.unit_price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => updateQty(i.id, i.quantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{i.quantity}</span>
                    <Button size="icon" variant="ghost" onClick={() => updateQty(i.id, i.quantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeCartItem(i.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {items.length > 5 && !showAll && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAll(true)}
                >
                  ดูทั้งหมด ({items.length})
                </Button>
              )}
              {showAll && items.length > 5 && (
                <Button variant="ghost" className="w-full" onClick={() => setShowAll(false)}>
                  ย่อรายการ
                </Button>
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>ยอดรวม</span>
                <span className="font-bold text-gold text-lg">฿{total.toFixed(2)}</span>
              </div>
              <Button onClick={doCheckout} variant="luxe" className="w-full">
                สรุปคำสั่งซื้อ
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
