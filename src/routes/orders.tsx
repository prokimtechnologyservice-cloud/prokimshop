import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { getUser } from "@/lib/auth";
import {
  fetchUserTracking,
  fetchPendingQueue,
  STATUS_FLOW,
  STATUS_LABEL,
  STATUS_COLOR,
  type TrackingItem,
} from "@/lib/tracking";
import { Package, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "ติดตามคำสั่งซื้อ — PROKIM" },
      { name: "description", content: "ติดตามสถานะการสั่งซื้อสินค้าของคุณ" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const [user, setUser] = useState(getUser());
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [queueMap, setQueueMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  async function load() {
    const u = getUser();
    setUser(u);
    if (!u) return setLoading(false);
    setLoading(true);
    const [mine, queue] = await Promise.all([
      fetchUserTracking(u.id),
      fetchPendingQueue(),
    ]);
    setItems(mine);
    const qm = new Map<string, number>();
    queue
      .filter((it) => it.fulfillment_status === "pending")
      .forEach((it, idx) => qm.set(it.id, idx + 1));
    setQueueMap(qm);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("orders-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="font-display text-4xl text-gradient-gold mb-6 flex items-center gap-2">
          <Package className="w-7 h-7 text-gold" /> ติดตามคำสั่งซื้อ
        </h1>

        {!user && (
          <div className="text-center text-muted-foreground py-20">
            กรุณาเข้าสู่ระบบเพื่อดูสถานะการสั่งซื้อ
          </div>
        )}

        {user && loading && (
          <div className="text-center text-muted-foreground py-20">
            <Loader2 className="w-6 h-6 animate-spin inline mr-2" /> กำลังโหลด...
          </div>
        )}

        {user && !loading && items.length === 0 && (
          <div className="text-center text-muted-foreground py-20">ยังไม่มีคำสั่งซื้อ</div>
        )}

        <div className="space-y-3">
          {items.map((it) => {
            const pos = queueMap.get(it.id);
            const total = it.unit_price * it.quantity;
            const status = it.fulfillment_status;
            const stepIdx = STATUS_FLOW.indexOf(status);
            return (
              <div
                key={it.id}
                className={`rounded-lg border p-4 bg-gradient-card shadow-card ${
                  status === "delivered"
                    ? "border-emerald-500/40"
                    : status === "pending"
                      ? "border-gold/40"
                      : "border-sky-500/40"
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-secondary/40 flex items-center justify-center">
                    {it.product_image ? (
                      <img
                        src={it.product_image}
                        alt={it.product_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      จำนวน {it.quantity} × ฿{it.unit_price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gold font-bold mt-0.5">฿{total.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(it.created_at).toLocaleString("th-TH")}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {status === "pending" && pos && (
                      <span className="text-[11px] text-muted-foreground">
                        คิวที่ <span className="text-gold font-bold">#{pos}</span>
                      </span>
                    )}
                    {status === "delivered" && it.acknowledged_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(it.acknowledged_at).toLocaleString("th-TH")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-1">
                  {STATUS_FLOW.map((s, i) => {
                    const done = i <= stepIdx;
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            done ? "bg-gold" : "bg-secondary"
                          }`}
                        />
                        <div
                          className={`text-[9px] leading-tight text-center ${
                            done ? "text-gold" : "text-muted-foreground/60"
                          }`}
                        >
                          {i === stepIdx ? (
                            <span className="flex items-center gap-0.5 justify-center">
                              {done && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {STATUS_LABEL[s]}
                            </span>
                          ) : (
                            STATUS_LABEL[s]
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
