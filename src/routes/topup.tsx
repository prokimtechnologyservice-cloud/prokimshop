import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { getUser, refreshUser, type UserSession } from "@/lib/auth";
import { callAuth, gatewayAction, userDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Gamepad2,
  Loader2,
  Package,
  Wallet,
  Minus,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/topup")({
  head: () => ({
    meta: [
      { title: "เติมของเกม Prokim City — PROKIM" },
      { name: "description", content: "เลือกไอเทม จ่ายด้วยยอดเงินในเว็บ แล้วเกม Prokim City จะส่งของให้คุณอัตโนมัติ" },
    ],
  }),
  component: TopupPage,
});

type TopupItem = {
  id: string;
  game_place: string;
  name: string;
  item_id: string;
  price: number;
  image_url: string | null;
  description: string | null;
};

type TopupOrder = {
  id: string;
  roblox_username: string;
  item_name: string;
  item_id: string;
  quantity: number;
  price: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivered_at: string | null;
  game_place: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอส่งของ",
  delivered: "ส่งสำเร็จ",
  failed: "ทำไม่สำเร็จ",
  cancelled: "ยกเลิก",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  delivered: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-secondary text-muted-foreground",
};

function TopupPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [items, setItems] = useState<TopupItem[]>([]);
  const [selected, setSelected] = useState<TopupItem | null>(null);
  const [roblox, setRoblox] = useState("");
  const [qty, setQty] = useState(1);
  const [paying, setPaying] = useState(false);
  const [mine, setMine] = useState<TopupOrder[]>([]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) setRoblox(u.roblox_name ?? "");
    const onAuth = () => {
      const nu = getUser();
      setUser(nu);
      if (nu) setRoblox((prev) => prev || nu.roblox_name || "");
    };
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  useEffect(() => {
    callAuth<TopupItem[]>("topup-items")
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]));
  }, []);

  async function loadMine() {
    if (!getUser()) return setMine([]);
    try {
      const { data } = await userDb
        .from("topup_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setMine((data as TopupOrder[]) ?? []);
    } catch {
      // session may have expired; ignore
    }
  }

  useEffect(() => {
    loadMine();
    const poll = setInterval(loadMine, 8000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const total = selected ? Number(selected.price) * qty : 0;

  async function pay() {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
      return;
    }
    if (!selected) {
      toast.error("เลือกไอเทมที่ต้องการก่อน");
      return;
    }
    const name = roblox.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
      toast.error("ชื่อผู้เล่น Roblox ไม่ถูกต้อง (3-20 ตัวอักษร ใช้ได้ a-z 0-9 _)");
      return;
    }
    setPaying(true);
    try {
      const res = await gatewayAction("user", "topup-purchase", {
        item_id: selected.id,
        quantity: qty,
        roblox_username: name,
      });
      const code = String(res?.id ?? "").slice(0, 8);
      toast.success(`สั่งซื้อสำเร็จ — ตัดยอด ฿${Number(res?.total ?? total).toLocaleString("th-TH")} รอเกมส่งของ (รหัส ${code})`);
      await refreshUser();
      loadMine();
    } catch (e: any) {
      toast.error(e.message ?? "สั่งซื้อไม่สำเร็จ");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="font-display text-4xl text-gradient-gold mb-2 flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-gold" /> เติมของเกม — Prokim City
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          เลือกไอเทม ใส่ชื่อผู้เล่น Roblox แล้วจ่ายด้วยยอดเงินในเว็บ ของจะถูกส่งเข้าเกมโดยอัตโนมัติ
        </p>

        {!user && (
          <div className="rounded-lg border border-gold/40 bg-gradient-card p-4 text-sm mb-6">
            กรุณาเข้าสู่ระบบ (หรือสมัครสมาชิก) ก่อนสั่งซื้อ — ยอดเงินจะถูกหักจากกระเป๋าในเว็บ
          </div>
        )}

        {user && (
          <div className="rounded-lg border border-border bg-gradient-card p-3 mb-6 flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4 text-gold" />
            ยอดเงินในเว็บ: <span className="font-bold text-gold">฿{(user.balance ?? 0).toLocaleString("th-TH")}</span>
          </div>
        )}

        {/* item selection */}
        <div className="font-semibold mb-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-gold" /> เลือกไอเทม / แพ็กเกจ
        </div>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-sm">
            ยังไม่มีไอเทมเปิดขาย — แอดมินสามารถเพิ่มได้ในหน้าแอดมิน แท็บ "เติมเกม"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelected(it)}
                className={`rounded-lg border p-3 text-left transition bg-gradient-card ${
                  selected?.id === it.id ? "border-gold" : "border-border hover:border-primary/40"
                }`}
              >
                {it.image_url && (
                  <img src={it.image_url} alt={it.name} className="w-full h-20 object-cover rounded-md mb-2" loading="lazy" />
                )}
                <div className="font-medium text-sm leading-tight">{it.name}</div>
                {it.description && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{it.description}</div>
                )}
                <div className="text-gold font-bold text-sm mt-1">฿{Number(it.price).toLocaleString("th-TH")}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{it.game_place}</div>
              </button>
            ))}
          </div>
        )}

        {/* order form */}
        <div className="rounded-lg border border-border bg-gradient-card p-4 space-y-3 mb-8">
          <div className="space-y-1.5">
            <Label>ชื่อผู้เล่น Roblox (ผู้ที่จะรับของในเกม)</Label>
            <Input
              value={roblox}
              onChange={(e) => setRoblox(e.target.value)}
              placeholder="เช่น ProkimPlayer"
              maxLength={20}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="shrink-0">จำนวน</Label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
              <Button size="icon" variant="outline" onClick={() => setQty((q) => Math.min(99, q + 1))}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">รวมทั้งหมด</span>
            <span className="font-display text-xl text-gradient-gold">฿{total.toLocaleString("th-TH")}</span>
          </div>
          <Button className="w-full" disabled={paying || !selected} onClick={pay}>
            {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
            ยืนยันคำสั่งซื้อ (หักยอดในเว็บทันที)
          </Button>
          <p className="text-[11px] text-muted-foreground">
            ถ้ายอดเงินไม่พอ ระบบจะแจ้งให้เติมเงินก่อน — ของจะถูกส่งเข้าเกมเมื่อเซิร์ฟเวอร์เกมดึงคำสั่งซื้อไป
          </p>
        </div>

        {/* my orders */}
        <div className="font-semibold mb-2">คำสั่งซื้อเติมเกมของฉัน</div>
        {mine.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-sm">ยังไม่มีคำสั่งซื้อ</div>
        ) : (
          <div className="space-y-2">
            {mine.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-gradient-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {o.item_name} <span className="text-muted-foreground">×{o.quantity}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    ผู้เล่น: {o.roblox_username} · {o.game_place}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {new Date(o.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="text-gold font-bold text-sm">฿{Number(o.price).toLocaleString("th-TH")}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${STATUS_STYLE[o.status] ?? ""}`}>
                    {o.status === "delivered" && <CheckCircle2 className="w-3 h-3" />}
                    {o.status === "failed" && <XCircle className="w-3 h-3" />}
                    {o.status === "cancelled" && <Ban className="w-3 h-3" />}
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
