import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, Receipt, Wallet } from "lucide-react";
import {
  fetchCart,
  removeCartItem,
  updateQty,
  clearCart,
  checkoutCart,
  ADMIN_CHAT_URL,
  type CartItem,
} from "@/lib/cart";
import { getUser, refreshUser } from "@/lib/auth";
import { toast } from "sonner";
import { TopUpDialog } from "@/components/TopUpDialog";

export function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [receipt, setReceipt] = useState<{
    items: CartItem[];
    total: number;
    code: string;
    paid: boolean;
  } | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [user, setUser] = useState(getUser());

  async function load() {
    const u = getUser();
    setUser(u);
    if (!u) return setItems([]);
    setItems(await fetchCart(u.id));
    await refreshUser();
    setUser(getUser());
  }

  useEffect(() => {
    if (open) load();
    const onChange = () => open && load();
    const onAuth = () => setUser(getUser());
    window.addEventListener("cart-change", onChange);
    window.addEventListener("auth-change", onAuth);
    return () => {
      window.removeEventListener("cart-change", onChange);
      window.removeEventListener("auth-change", onAuth);
    };
  }, [open]);

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const visible = showAll ? items : items.slice(0, 5);
  const balance = Number(user?.balance ?? 0);
  const canPayWithBalance = balance >= total && total > 0;

  const [busy, setBusy] = useState(false);

  async function doCheckout(payFromBalance: boolean) {
    const u = getUser();
    if (!u || items.length === 0 || busy) return;
    setBusy(true);
    const token = crypto.randomUUID();
    try {
      const result = await checkoutCart(u.id, items, payFromBalance, token);
      setReceipt({ items: [...items], total, code: result.receipt_code, paid: payFromBalance });
      await clearCart(u.id);
      if (payFromBalance) await refreshUser();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }


  function contactAdmin() {
    window.open(ADMIN_CHAT_URL, "_blank", "noopener,noreferrer");
    setReceipt(null);
    onOpenChange(false);
  }

  function cancelOrder() {
    setReceipt(null);
    toast("ปิดใบเสร็จแล้ว");
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl text-gradient-gold">
              ตะกร้าสินค้า
            </SheetTitle>
          </SheetHeader>

          {!user ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              กรุณาเข้าสู่ระบบเพื่อใช้งานตะกร้า
            </div>
          ) : receipt ? (
            <div className="flex-1 overflow-auto mt-4 px-1">
              <div className="border border-gold/40 rounded-lg p-5 bg-gradient-card">
                <div className="text-center font-display text-xl text-gold mb-1">
                  <Receipt className="inline w-5 h-5 mr-1" /> Prokim
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  {new Date().toLocaleString("th-TH")}
                </div>
                <div className="text-center text-xs font-mono text-gold mb-2 select-all">
                  {receipt.code}
                </div>
                {receipt.paid && (
                  <div className="text-center text-xs text-emerald-400 mb-2">
                    ✓ ชำระจากยอดในเว็บแล้ว
                  </div>
                )}
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
                  * กรุณาแคปหน้านี้ส่งให้แอดมินเพื่อรับสินค้า
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={contactAdmin} variant="luxe" className="flex-1">
                  ทักแชทแอดมิน
                </Button>
                <Button onClick={cancelOrder} variant="outline" className="flex-1">
                  ปิด
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
                  <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
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
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> ยอดในเว็บ</span>
                  <span className={canPayWithBalance ? "text-emerald-400" : ""}>฿{balance.toFixed(2)}</span>
                </div>

                {canPayWithBalance ? (
                  <Button onClick={() => doCheckout(true)} disabled={busy} variant="luxe" className="w-full">
                    {busy ? "กำลังดำเนินการ..." : `ชำระด้วยยอดในเว็บ (฿${total.toFixed(2)})`}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => doCheckout(false)} disabled={busy} variant="luxe">
                      {busy ? "กำลังดำเนินการ..." : "ชำระกับแอดมิน"}
                    </Button>
                    <Button onClick={() => setTopUpOpen(true)} variant="outline">
                      <Wallet className="w-4 h-4 mr-1" /> เติมเงิน
                    </Button>
                  </div>
                )}

                {!canPayWithBalance && total > 0 && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    ยอดในเว็บไม่พอ (ขาด ฿{(total - balance).toFixed(2)}) — เติมซอง TrueMoney เพื่อชำระอัตโนมัติ
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} onDone={() => load()} />
    </>
  );
}
