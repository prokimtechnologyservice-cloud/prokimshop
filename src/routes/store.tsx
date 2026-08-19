import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, Minus, Plus, ShoppingCart, Store, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "หน้าร้าน PROKIM — สั่งซื้อหน้าร้าน" },
      { name: "description", content: "ระบบสั่งซื้อสำหรับลูกค้าหน้าร้าน PROKIM ชำระเงินกับพนักงานที่เคาน์เตอร์" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "หน้าร้าน PROKIM" },
      { property: "og:description", content: "ระบบสั่งซื้อสำหรับลูกค้าหน้าร้าน ชำระเงินกับพนักงาน" },
    ],
  }),
  component: StorePage,
});

type Cat = { id: string; name: string; parent_id: string | null; sort_order: number; created_at: string };
type Prod = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  stock: number | null;
  sort_order: number;
  created_at: string;
};
type Line = { product_id: string; product_name: string; image_url: string | null; unit_price: number; quantity: number };

const CODE_KEY = "prokim_store_code";
const ORDERS_KEY = "prokim_store_orders";

const DELIVERY_LABEL: Record<string, string> = {
  none: "รอดำเนินการ",
  delivered: "ส่งแล้ว",
  waiting_stock: "รอของ",
  no_contact: "ติดต่อลูกค้าไม่ได้",
  failed: "ส่งไม่ผ่าน",
};

async function api(payload: any) {
  const res = await fetch("/api/public/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "เกิดข้อผิดพลาด");
  return j;
}

function StorePage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [shift, setShift] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem(CODE_KEY);
    if (!saved) return setChecking(false);
    api({ action: "gate", code: saved })
      .then((j) => {
        setCode(saved);
        setShift(j.shift_label ?? null);
        setUnlocked(true);
      })
      .catch(() => sessionStorage.removeItem(CODE_KEY))
      .finally(() => setChecking(false));
  }, []);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const j = await api({ action: "gate", code });
      sessionStorage.setItem(CODE_KEY, code);
      setShift(j.shift_label ?? null);
      setUnlocked(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="store-theme min-h-screen">
      {checking ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !unlocked ? (
        <div className="min-h-screen flex items-center justify-center px-4">
          <form
            onSubmit={submitGate}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">หน้าร้าน PROKIM</h1>
                <p className="text-xs text-muted-foreground">ใส่รหัสผ่านประจำวัน/รอบจากพนักงาน</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-code">รหัสผ่านหน้าร้าน</Label>
              <PasswordInput
                id="store-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="กรอกรหัส"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base">
              เข้าใช้งาน
            </Button>
          </form>
        </div>
      ) : (
        <StoreShop accessCode={code} shift={shift} />
      )}
    </div>
  );
}

function StoreShop({ accessCode, shift }: { accessCode: string; shift: string | null }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [view, setView] = useState<"shop" | "cart" | "orders">("shop");
  const [detail, setDetail] = useState<Prod | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order").order("created_at"),
        supabase.from("products").select("*").order("sort_order").order("created_at"),
      ]);
      setCats((c as Cat[]) ?? []);
      setProds((p as Prod[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const rootCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const subCats = useMemo(
    () => (activeCat ? cats.filter((c) => c.parent_id === activeCat) : []),
    [cats, activeCat],
  );
  const shown = useMemo(() => {
    if (!activeCat) return prods;
    const ids = new Set<string>([activeCat, ...cats.filter((c) => c.parent_id === activeCat).map((c) => c.id)]);
    return prods.filter((p) => ids.has(p.category_id));
  }, [prods, cats, activeCat]);

  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  function add(p: Prod) {
    if (p.stock !== null && p.stock <= 0) return toast.error("สินค้าหมด");
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        { product_id: p.id, product_name: p.name, image_url: p.image_url, unit_price: Number(p.price), quantity: 1 },
      ];
    });
    toast.success(`เพิ่ม ${p.name} แล้ว`);
  }
  function setQty(id: string, q: number) {
    setLines((prev) =>
      q <= 0 ? prev.filter((l) => l.product_id !== id) : prev.map((l) => (l.product_id === id ? { ...l, quantity: q } : l)),
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold">หน้าร้าน PROKIM</div>
              <div className="text-[11px] text-muted-foreground">
                {shift ? shift : "ชำระเงินสดกับพนักงาน"}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-10" onClick={() => setView("orders")}>
            ออเดอร์ของฉัน
          </Button>
        </div>
      </header>

      {view === "cart" ? (
        <CartView
          lines={lines}
          total={total}
          accessCode={accessCode}
          onBack={() => setView("shop")}
          setQty={setQty}
          onDone={() => {
            setLines([]);
            setView("orders");
          }}
        />
      ) : view === "orders" ? (
        <MyOrders onBack={() => setView("shop")} />
      ) : (
        <main className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <Button
              size="sm"
              className="h-10 shrink-0"
              variant={activeCat === null ? "default" : "outline"}
              onClick={() => setActiveCat(null)}
            >
              ทั้งหมด
            </Button>
            {rootCats.map((c) => (
              <Button
                key={c.id}
                size="sm"
                className="h-10 shrink-0"
                variant={activeCat === c.id ? "default" : "outline"}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>

          {subCats.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {subCats.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={activeCat === s.id ? "default" : "secondary"}
                  className="h-9 shrink-0"
                  onClick={() => setActiveCat(s.id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {shown.map((p) => {
                const out = p.stock !== null && p.stock <= 0;
                return (
                  <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <button className="block w-full" onClick={() => setDetail(p)}>
                      <div className="aspect-square bg-secondary overflow-hidden">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                    </button>
                    <div className="p-3 space-y-2">
                      <div className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{Number(p.price).toLocaleString("th-TH")} ฿</span>
                        {out ? (
                          <span className="text-xs font-bold text-destructive">หมด</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {p.stock === null ? "พร้อมส่ง" : `เหลือ ${p.stock}`}
                          </span>
                        )}
                      </div>
                      <Button className="w-full h-11" disabled={out} onClick={() => add(p)}>
                        <Plus className="w-4 h-4" /> ใส่รายการ
                      </Button>
                    </div>
                  </div>
                );
              })}
              {shown.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">ยังไม่มีสินค้าในหมวดนี้</div>
              )}
            </div>
          )}
        </main>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="aspect-square bg-secondary overflow-hidden">
              {detail.image_url && (
                <img src={detail.image_url} alt={detail.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-4 space-y-3">
              <h2 className="text-lg font-bold">{detail.name}</h2>
              <div className="text-xl font-bold text-primary">
                {Number(detail.price).toLocaleString("th-TH")} ฿
              </div>
              {detail.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{detail.description}</p>
              )}
              <div className="text-sm">
                {detail.stock === null
                  ? "พร้อมส่ง"
                  : detail.stock <= 0
                    ? "สินค้าหมด"
                    : `จำนวนคงเหลือ ${detail.stock}`}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setDetail(null)}>
                  ปิด
                </Button>
                <Button
                  className="flex-1 h-12"
                  disabled={detail.stock !== null && detail.stock <= 0}
                  onClick={() => {
                    add(detail);
                    setDetail(null);
                  }}
                >
                  ใส่รายการ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "shop" && count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3">
          <div className="mx-auto max-w-3xl">
            <Button className="w-full h-14 text-base" onClick={() => setView("cart")}>
              <ShoppingCart className="w-5 h-5" /> ดูรายการ ({count}) · {total.toLocaleString("th-TH")} ฿
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartView({
  lines,
  total,
  accessCode,
  setQty,
  onBack,
  onDone,
}: {
  lines: Line[];
  total: number;
  accessCode: string;
  setQty: (id: string, q: number) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<{ order_no: string; total: number } | null>(null);

  async function confirm() {
    if (lines.length === 0) return;
    setBusy(true);
    try {
      const j = await api({
        action: "create",
        access_code: accessCode,
        customer_name: name,
        note,
        items: lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          image_url: l.image_url,
          unit_price: l.unit_price,
          quantity: l.quantity,
        })),
      });
      const saved: string[] = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
      localStorage.setItem(ORDERS_KEY, JSON.stringify([j.order.order_no, ...saved].slice(0, 30)));
      setPlaced({ order_no: j.order.order_no, total: Number(j.order.total) });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center space-y-4">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="text-sm text-muted-foreground">หมายเลขออเดอร์ของคุณ</div>
          <div className="text-3xl font-extrabold tracking-wider text-primary">{placed.order_no}</div>
          <div className="text-lg font-bold">ยอดชำระ {placed.total.toLocaleString("th-TH")} ฿</div>
          <p className="text-sm text-muted-foreground">
            กรุณาแจ้งหมายเลขนี้และชำระเงินกับพนักงาน/แคชเชียร์ที่เคาน์เตอร์
          </p>
        </div>
        <Button className="w-full h-12" onClick={onDone}>
          ดูออเดอร์ของฉัน
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      <Button variant="ghost" className="h-10" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" /> เลือกสินค้าต่อ
      </Button>

      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.product_id} className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
              {l.image_url && <img src={l.image_url} alt={l.product_name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{l.product_name}</div>
              <div className="text-primary font-bold text-sm">
                {(l.unit_price * l.quantity).toLocaleString("th-TH")} ฿
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setQty(l.product_id, l.quantity - 1)}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-bold">{l.quantity}</span>
              <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setQty(l.product_id, l.quantity + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {lines.length === 0 && <div className="text-center text-muted-foreground py-14">ยังไม่มีรายการ</div>}
      </div>

      {lines.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cust">ชื่อลูกค้า / ชื่อในเกม (ถ้ามี)</Label>
            <Input id="cust" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ปูคิม / RobloxName" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between text-lg font-bold">
            <span>ยอดรวม</span>
            <span className="text-primary">{total.toLocaleString("th-TH")} ฿</span>
          </div>
          <p className="text-xs text-muted-foreground">ชำระเงินสดกับพนักงานที่เคาน์เตอร์หลังยืนยันออเดอร์</p>
          <Button className="w-full h-14 text-base" disabled={busy} onClick={confirm}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "ยืนยันออเดอร์"}
          </Button>
        </div>
      )}
    </main>
  );
}

function MyOrders({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const nos: string[] = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
    if (nos.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const j = await api({ action: "status", order_nos: nos });
      setOrders(j.orders ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  async function cancel(no: string) {
    try {
      await api({ action: "cancel", order_no: no });
      const nos: string[] = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
      localStorage.setItem(ORDERS_KEY, JSON.stringify(nos.filter((n) => n !== no)));
      toast.success("ลบออเดอร์แล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="h-10" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> กลับไปเลือกสินค้า
        </Button>
        <Button variant="outline" size="sm" className="h-10" onClick={load}>
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">ยังไม่มีออเดอร์</div>
      ) : (
        orders.map((o) => {
          const age = Date.now() - new Date(o.created_at).getTime();
          const canCancel = o.payment_status !== "paid" && age >= 20 * 60 * 1000;
          const minsLeft = Math.max(0, Math.ceil((20 * 60 * 1000 - age) / 60000));
          return (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-extrabold tracking-wide text-primary">{o.order_no}</div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    o.payment_status === "paid"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {o.payment_status === "paid" ? "ชำระเงินแล้ว" : "รอชำระที่เคาน์เตอร์"}
                </span>
              </div>
              <div className="space-y-1">
                {(o.store_order_items ?? []).map((it: any) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                      {it.image_url && <img src={it.image_url} alt={it.product_name} className="w-full h-full object-cover" />}
                    </div>
                    <span className="flex-1 truncate">{it.product_name}</span>
                    <span className="text-muted-foreground">x{it.quantity}</span>
                    <span className="font-semibold">{(Number(it.unit_price) * it.quantity).toLocaleString("th-TH")} ฿</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">สถานะการส่ง: {DELIVERY_LABEL[o.delivery_status] ?? "-"}</span>
                <span className="font-bold">รวม {Number(o.total).toLocaleString("th-TH")} ฿</span>
              </div>
              {o.delivery_note && <p className="text-xs text-muted-foreground">หมายเหตุ: {o.delivery_note}</p>}
              {o.payment_status !== "paid" && (
                <Button
                  variant="outline"
                  className="w-full h-11"
                  disabled={!canCancel}
                  onClick={() => cancel(o.order_no)}
                >
                  <Trash2 className="w-4 h-4" />
                  {canCancel ? "ลบออเดอร์นี้" : `ลบได้ในอีก ${minsLeft} นาที`}
                </Button>
              )}
            </div>
          );
        })
      )}
    </main>
  );
}
