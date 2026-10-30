import { useCallback, useEffect, useMemo, useState } from "react";
import { getStaff } from "@/lib/auth";
import { gatewayAction, staffDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Ban,
  CheckCircle2,
  Download,
  Gamepad2,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type TopupOrder = {
  id: string;
  user_id: string;
  roblox_username: string;
  roblox_user_id: number | null;
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

type TopupItem = {
  id: string;
  game_place: string;
  name: string;
  item_id: string;
  price: number;
  image_url: string | null;
  description: string | null;
  active: boolean;
  sort_order: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอส่งของ",
  delivered: "ส่งสำเร็จ",
  failed: "ทำไม่สำเร็จ",
  cancelled: "ยกเลิก",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอส่งของ" },
  { value: "delivered", label: "ส่งสำเร็จ" },
  { value: "failed", label: "ทำไม่สำเร็จ" },
  { value: "cancelled", label: "ยกเลิก" },
];

const emptyForm = {
  name: "",
  item_id: "",
  price: "",
  game_place: "prokim_city",
  description: "",
  sort_order: "0",
};

export function TopupManager() {
  const staff = getStaff();
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [items, setItems] = useState<TopupItem[]>([]);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const load = useCallback(async () => {
    if (!staff) return;
    try {
      const [o, i, u] = await Promise.all([
        staffDb.from("topup_orders").select("*").order("created_at", { ascending: false }).limit(500),
        staffDb.from("topup_items").select("*").order("sort_order", { ascending: true }),
        staffDb.from("profiles").select("id, username").limit(2000),
      ]);
      setOrders((o.data as TopupOrder[]) ?? []);
      setItems((i.data as TopupItem[]) ?? []);
      const m = new Map<string, string>();
      ((u.data as any[]) ?? []).forEach((p) => m.set(p.id, p.username));
      setUserMap(m);
    } catch (e: any) {
      toast.error(e.message ?? "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function setStatus(orderId: string, status: string) {
    if (!staff) return;
    const label = STATUS_LABEL[status];
    if (status !== "delivered" && !confirm(`ยืนยันเปลี่ยนสถานะเป็น "${label}"? ระบบจะคืนเงินให้ลูกค้าอัตโนมัติ`)) return;
    try {
      await gatewayAction("staff", "topup-staff-update", { order_id: orderId, status });
      toast.success(`อัปเดตเป็น "${label}" แล้ว`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "อัปเดตไม่สำเร็จ");
    }
  }

  function exportCsv() {
    const header = [
      "created_at", "order_id", "game_place", "roblox_username", "roblox_user_id",
      "item_name", "item_id", "quantity", "price", "status", "payment_status", "delivered_at", "web_username",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const o of filtered) {
      lines.push(
        [
          o.created_at, o.id, o.game_place, o.roblox_username, o.roblox_user_id ?? "",
          o.item_name, o.item_id, o.quantity, o.price, o.status, o.payment_status, o.delivered_at ?? "",
          userMap.get(o.user_id) ?? "",
        ].map(esc).join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `topup-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveItem() {
    if (!staff) return;
    const name = form.name.trim();
    const itemId = form.item_id.trim();
    const price = Number(form.price);
    if (!name || !itemId || !(price >= 0)) {
      toast.error("กรอกชื่อไอเทม รหัสไอเทม และราคาให้ครบ");
      return;
    }
    setSavingItem(true);
    const row = {
      name,
      item_id: itemId,
      price,
      game_place: form.game_place.trim() || "prokim_city",
      description: form.description.trim() || null,
      sort_order: Math.max(0, Math.floor(Number(form.sort_order) || 0)),
    };
    try {
      if (editingId) {
        const { error } = await staffDb.from("topup_items").update(row).eq("id", editingId);
        if (error) throw new Error(error.message);
        toast.success("บันทึกไอเทมแล้ว");
      } else {
        const { error } = await staffDb.from("topup_items").insert(row);
        if (error) throw new Error(error.message);
        toast.success("เพิ่มไอเทมแล้ว");
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSavingItem(false);
    }
  }

  async function toggleItem(it: TopupItem) {
    try {
      const { error } = await staffDb.from("topup_items").update({ active: !it.active }).eq("id", it.id);
      if (error) throw new Error(error.message);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "อัปเดตไม่สำเร็จ");
    }
  }

  async function deleteItem(it: TopupItem) {
    if (!confirm(`ลบไอเทม "${it.name}"?`)) return;
    try {
      const { error } = await staffDb.from("topup_items").delete().eq("id", it.id);
      if (error) throw new Error(error.message);
      if (editingId === it.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      load();
    } catch (e: any) {
      toast.error(e.message ?? "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* ===== Orders ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-gold" /> คำสั่งเติมเกม ({filtered.length})
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4" /> ส่งออก CSV
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4" /> รีเฟรช
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-14">ไม่มีคำสั่งในสถานะนี้</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o.id} className="bg-gradient-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-medium text-sm">
                  {o.item_name} <span className="text-muted-foreground">×{o.quantity}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  ผู้เล่น: <span className="text-foreground">{o.roblox_username}</span>
                  {o.roblox_user_id ? ` (ID ${o.roblox_user_id})` : ""} · {o.game_place} · {o.item_id}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("th-TH")}
                  {` · ซื้อโดย ${userMap.get(o.user_id) ?? o.user_id.slice(0, 8)}`}
                  {o.delivered_at ? ` · ส่งเมื่อ ${new Date(o.delivered_at).toLocaleString("th-TH")}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-gold font-bold text-sm">฿{Number(o.price).toLocaleString("th-TH")}</div>
                <div className="text-[10px] text-muted-foreground">
                  {o.payment_status === "paid" ? "ชำระแล้ว" : "ยังไม่ชำระ"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    o.status === "pending"
                      ? "bg-amber-500/15 text-amber-300"
                      : o.status === "delivered"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : o.status === "failed"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                {o.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "delivered")}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> ส่งสำเร็จ (มือ)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "failed")}>
                      <XCircle className="w-3.5 h-3.5" /> ทำไม่สำเร็จ
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(o.id, "cancelled")}>
                      <Ban className="w-3.5 h-3.5" /> ยกเลิก
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Items ===== */}
      <div className="bg-gradient-card border border-border rounded-xl p-4 space-y-3">
        <div className="font-semibold">
          {editingId ? "แก้ไขไอเทม" : "เพิ่มไอเทม / แพ็กเกจ (สิ่งที่เกมส่งได้)"}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>ชื่อไอเทม (แสดงให้ลูกค้า)</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น 1,000 เหรียญ" />
          </div>
          <div className="space-y-1.5">
            <Label>รหัสไอเทมในเกม (item_id ที่สคริปต์เกมใช้)</Label>
            <Input value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })} placeholder="เช่น coins_1000" />
          </div>
          <div className="space-y-1.5">
            <Label>ราคา (บาท)</Label>
            <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" placeholder="49" />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อแมพ (game_place)</Label>
            <Input value={form.game_place} onChange={(e) => setForm({ ...form, game_place: e.target.value })} placeholder="prokim_city" />
          </div>
          <div className="space-y-1.5">
            <Label>คำอธิบาย (ไม่บังคับ)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>ลำดับการแสดง</Label>
            <Input value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} inputMode="numeric" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveItem} disabled={savingItem}>
            {savingItem && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {editingId ? "บันทึกการแก้ไข" : "เพิ่มไอเทม"}
          </Button>
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              ยกเลิกการแก้ไข
            </Button>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <div className="text-xs text-muted-foreground">ไอเทมทั้งหมด ({items.length})</div>
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm">
                <div className="flex-1 min-w-[180px]">
                  <span className="font-medium">{it.name}</span>
                  <span className="text-muted-foreground"> · {it.item_id} · {it.game_place}</span>
                </div>
                <span className="text-gold font-bold">฿{Number(it.price).toLocaleString("th-TH")}</span>
                <Button
                  size="sm"
                  variant={it.active ? "outline" : "ghost"}
                  className={it.active ? "" : "text-muted-foreground"}
                  onClick={() => toggleItem(it)}
                >
                  {it.active ? "เปิดขาย" : "ปิดขาย"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(it.id);
                    setForm({
                      name: it.name,
                      item_id: it.item_id,
                      price: String(it.price),
                      game_place: it.game_place,
                      description: it.description ?? "",
                      sort_order: String(it.sort_order ?? 0),
                    });
                  }}
                >
                  แก้ไข
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteItem(it)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
