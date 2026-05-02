import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_CHAT_URL } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ประวัติการซื้อ — PROKIM" },
      { name: "description", content: "ใบเสร็จการสั่งซื้อย้อนหลังของคุณ" },
    ],
  }),
  component: HistoryPage,
});

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  receipt_code: string | null;
  order_items: { product_name: string; unit_price: number; quantity: number }[];
};

function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    (async () => {
      const u = getUser();
      setUser(u);
      if (!u) return;
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at, receipt_code, order_items(product_name, unit_price, quantity)")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });
      setOrders(((data as any[]) ?? []).map((o) => ({ ...o, total: Number(o.total) })));
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="font-display text-4xl text-gradient-gold mb-6 flex items-center gap-2">
          <Receipt className="w-7 h-7 text-gold" /> ประวัติการซื้อ
        </h1>

        {!user && (
          <div className="text-center text-muted-foreground py-20">
            กรุณาเข้าสู่ระบบเพื่อดูประวัติ
          </div>
        )}
        {user && orders.length === 0 && (
          <div className="text-center text-muted-foreground py-20">ยังไม่มีรายการสั่งซื้อ</div>
        )}

        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border border-gold/30 rounded-lg p-5 bg-gradient-card shadow-card"
            >
              <div className="text-center font-display text-lg text-gold mb-1">
                Prokim
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString("th-TH")}
              </div>
              <div className="text-center text-xs font-mono text-gold mb-3 select-all">
                {o.receipt_code ?? `#${o.id.slice(0, 8)}`}
              </div>
              <div className="border-t border-dashed border-border my-2" />
              <div className="space-y-1 text-sm">
                {o.order_items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {i.product_name} × {i.quantity}
                    </span>
                    <span>฿{(Number(i.unit_price) * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border my-2" />
              <div className="flex justify-between font-bold">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-gold">฿{o.total.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(o.receipt_code ?? o.id);
                    toast.success("คัดลอกรหัสใบเสร็จแล้ว");
                  }}
                >
                  คัดลอกรหัส
                </Button>
                <Button
                  size="sm"
                  variant="luxe"
                  onClick={() => window.open(ADMIN_CHAT_URL, "_blank", "noopener,noreferrer")}
                >
                  ทักแชทแอดมิน
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
