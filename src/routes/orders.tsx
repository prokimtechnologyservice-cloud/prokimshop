import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { getUser } from "@/lib/auth";
import {
  fetchUserTracking,
  fetchPendingQueue,
  STATUS_FLOW,
  SPECIAL_STATUSES,
  STATUS_LABEL,
  STATUS_COLOR,
  RETURN_LABEL,
  requestReturn,
  requestRefund,
  unpaidDeadline,
  type TrackingItem,
} from "@/lib/tracking";
import {
  Package,
  Clock,
  Loader2,
  CheckCircle2,
  KeyRound,
  Copy,
  ShieldAlert,
  RotateCcw,
  BadgeDollarSign,
  AlertTriangle,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

function fmtCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function OrdersPage() {
  const [user, setUser] = useState(getUser());
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [queueMap, setQueueMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);
  const firedMaintenance = useRef(false);

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
    if (!firedMaintenance.current) {
      firedMaintenance.current = true;
      fetch("/api/public/order-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expire_unpaid" }),
      })
        .catch(() => {})
        .finally(() => load());
    } else {
      load();
    }
    const ch = supabase
      .channel("orders-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .subscribe();
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(tick);
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
            const isSpecial = (SPECIAL_STATUSES as string[]).includes(status);
            const stepIdx = STATUS_FLOW.indexOf(status as any);
            const isUnpaid = it.order_payment_status === "unpaid";
            const remainingMs = isUnpaid && it.order_created_at
              ? unpaidDeadline({ created_at: it.order_created_at, payment_status: it.order_payment_status })
              : 0;
            return (
              <div
                key={it.id}
                className={`rounded-lg border p-4 bg-gradient-card shadow-card ${
                  status === "delivered"
                    ? "border-emerald-500/40"
                    : status === "pending"
                      ? "border-gold/40"
                      : isSpecial
                        ? "border-destructive/40"
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
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isUnpaid && status === "pending"
                          ? "bg-amber-500/15 text-amber-300"
                          : STATUS_COLOR[status]
                      }`}
                    >
                      {isUnpaid && status === "pending" ? "รอชำระ" : STATUS_LABEL[status]}
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

                {isUnpaid && (
                  <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {remainingMs > 0 ? (
                      <span>
                        ต้องชำระภายใน{" "}
                        <span className="font-bold tabular-nums">{fmtCountdown(remainingMs)}</span>{" "}
                        ไม่เช่นนั้นออเดอร์จะถูกยกเลิกและสินค้ากลับเข้าตะกร้า
                      </span>
                    ) : (
                      <span>เลยกำหนดชำระแล้ว ระบบจะยกเลิกออเดอร์นี้และคืนสินค้าเข้าตะกร้าโดยอัตโนมัติ</span>
                    )}
                  </div>
                )}

                {isSpecial ? (
                  <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {STATUS_LABEL[status]}
                  </div>
                ) : (
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
                )}

                {it.roblox_name && it.product_type !== "account" && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    ผู้เล่น Roblox: <span className="text-gold font-medium">{it.roblox_name}</span>
                  </div>
                )}

                {it.product_type === "account" && it.delivered_payload && (
                  <AccountPayloadBlock payload={it.delivered_payload} instructions={it.claim_instructions ?? undefined} />
                )}

                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  {it.return_status && it.return_status !== "none" ? (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        it.return_status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : it.return_status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {RETURN_LABEL[it.return_status]}
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    {status === "pending" && (!it.return_status || it.return_status === "none") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] h-7 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          if (isUnpaid) {
                            if (!confirm("ยกเลิกคำสั่งซื้อรายการนี้?")) return;
                            try {
                              await cancelOrderItem(it.id);
                              toast.success("ยกเลิกคำสั่งแล้ว");
                              load();
                            } catch (e: any) {
                              toast.error(e.message ?? "ยกเลิกไม่สำเร็จ");
                            }
                            return;
                          }
                          try {
                            await requestRefund(it.id);
                            toast.success("ส่งคำขอคืนเงินแล้ว");
                            load();
                          } catch (e: any) {
                            toast.error(e.message ?? "ส่งคำขอไม่สำเร็จ");
                          }
                        }}
                      >
                        <BadgeDollarSign className="w-3 h-3" /> {isUnpaid ? "ยกเลิกคำสั่ง" : "ขอคืนเงิน"}
                      </Button>
                    )}

                    {status === "delivered" && (!it.return_status || it.return_status === "none") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] h-7 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          const reason = prompt("เหตุผลในการขอคืนสินค้า");
                          if (reason == null) return;
                          try {
                            await requestReturn(it.id, reason);
                            toast.success("ส่งคำขอคืนสินค้าแล้ว");
                            load();
                          } catch (e: any) {
                            toast.error(e.message ?? "ส่งคำขอไม่สำเร็จ");
                          }
                        }}
                      >
                        <RotateCcw className="w-3 h-3" /> ขอคืนสินค้า
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

type ClaimStep = { heading: string | null; text: string };

function parseClaimInstructions(raw: string): ClaimStep[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const steps: ClaimStep[] = [];
  let currentHeading: string | null = null;
  for (const line of lines) {
    if (line.endsWith(":")) {
      currentHeading = line.slice(0, -1);
      continue;
    }
    steps.push({ heading: currentHeading, text: line.replace(/^\d+[.)]\s*/, "") });
  }
  return steps;
}

function AccountPayloadBlock({
  payload,
  instructions,
}: {
  payload: string;
  instructions?: string;
}) {
  const defaultClaim = `คำแนะนำ:
เมื่อได้ไอดีไปต้องเปลี่ยนรหัสทันที

วิธีเคลมเมื่อไอดีมีปัญหา:
อัดวิดีโอตั้งแต่ ซื้อสินค้า → เข้ารหัส
หากไม่มีหลักฐาน แอดมินไม่คืนเงินทุกกรณี`;
  const text = instructions?.trim() ? instructions : defaultClaim;
  const steps = parseClaimInstructions(text);

  // Group consecutive steps under the same heading.
  const groups: { heading: string | null; items: string[] }[] = [];
  for (const s of steps) {
    const last = groups[groups.length - 1];
    if (last && last.heading === s.heading) {
      last.items.push(s.text);
    } else {
      groups.push({ heading: s.heading, items: [s.text] });
    }
  }
  const borderColors = ["border-gold", "border-destructive", "border-sky-500", "border-emerald-500"];

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-lg border border-gold/50 bg-onyx/60 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] uppercase tracking-widest text-gold flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> บัญชีที่ได้รับ
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard?.writeText(payload);
              toast.success("คัดลอกแล้ว");
            }}
          >
            <Copy className="w-3 h-3 mr-1" /> คัดลอก
          </Button>
        </div>
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-gold select-all">
          {payload}
        </pre>
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gold mb-2">
          <ListOrdered className="w-3.5 h-3.5" /> วิธีรับสินค้า / คำแนะนำ
        </div>
        <div className="space-y-3">
          {groups.map((g, gi) => (
            <div
              key={gi}
              className={`border-l-2 pl-3 ${borderColors[gi % borderColors.length]}`}
            >
              {g.heading && (
                <div className="text-xs font-semibold text-foreground mb-1">{g.heading}</div>
              )}
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-muted-foreground">
                {g.items.map((t, ti) => (
                  <li key={ti}>{t}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
        <div className="flex items-center gap-1 text-destructive font-bold mb-1">
          <ShieldAlert className="w-3.5 h-3.5" /> อ่านก่อนใช้งาน
        </div>
        <div className="text-muted-foreground leading-relaxed">
          กรุณาเก็บหลักฐานทุกขั้นตอนตั้งแต่การซื้อจนถึงการเข้าใช้งาน หากมีปัญหาแต่ไม่มีหลักฐาน แอดมินขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี
        </div>
      </div>
    </div>
  );
}
