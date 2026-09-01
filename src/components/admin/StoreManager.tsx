import { useCallback, useEffect, useState } from "react";
import { getStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, RefreshCw, Trash2, CheckCircle2, Truck, Store } from "lucide-react";
import { toast } from "sonner";

type StoreOrder = {
  id: string;
  order_no: string;
  customer_name: string | null;
  note: string | null;
  total: number;
  payment_status: string;
  paid_at: string | null;
  paid_by: string | null;
  delivery_status: string;
  delivery_note: string | null;
  delivered_by: string | null;
  created_at: string;
  store_order_items: {
    id: string;
    product_name: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
  }[];
};

const DELIVERY_OPTIONS: { value: string; label: string }[] = [
  { value: "delivered", label: "ส่งแล้ว" },
  { value: "waiting_stock", label: "รอของ" },
  { value: "no_contact", label: "ติดต่อลูกค้าไม่ได้" },
  { value: "failed", label: "ส่งไม่ผ่าน" },
];
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

export function StoreManager() {
  const staff = getStaff();
  const isManager = staff?.role === "manager";
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [settings, setSettings] = useState<{
    access_code: string;
    confirm_code: string;
    store_open: boolean;
    shift_label: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!staff) return;
    try {
      const j = await api({ action: "staff_list", staff_code: staff.staff_code });
      setOrders(j.orders ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [staff?.staff_code]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!isManager || !staff) return;
    api({ action: "settings_get", staff_code: staff.staff_code })
      .then((j) => setSettings(j.settings))
      .catch(() => {});
  }, [isManager, staff?.staff_code]);

  async function saveSettings() {
    if (!settings || !staff) return;
    try {
      await api({ action: "settings_save", staff_code: staff.staff_code, ...settings });
      toast.success("บันทึกรหัสหน้าร้านแล้ว");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function pay(orderId: string) {
    if (!staff) return;
    try {
      await api({
        action: "staff_pay",
        staff_code: staff.staff_code,
        confirm_code: confirmCode,
        order_id: orderId,
      });
      toast.success("ยืนยันการชำระเงินแล้ว");
      setConfirmFor(null);
      setConfirmCode("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function deliver(orderId: string, status: string) {
    if (!staff) return;
    try {
      await api({ action: "staff_deliver", staff_code: staff.staff_code, order_id: orderId, delivery_status: status });
      toast.success("อัปเดตสถานะแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(orderId: string) {
    if (!staff) return;
    if (!confirm("ลบออเดอร์นี้?")) return;
    try {
      await api({ action: "staff_delete", staff_code: staff.staff_code, order_id: orderId });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5 py-4">
      {isManager && settings && (
        <div className="bg-gradient-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Store className="w-4 h-4 text-gold" /> รหัสหน้าร้าน (เฉพาะผู้จัดการ)
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>รหัสผ่านเข้าหน้าร้าน (/store)</Label>
              <PasswordInput
                value={settings.access_code}
                onChange={(e) => setSettings({ ...settings, access_code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>รหัสยืนยันการชำระเงิน</Label>
              <PasswordInput
                value={settings.confirm_code}
                onChange={(e) => setSettings({ ...settings, confirm_code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อรอบ / วันที่ (แสดงให้ลูกค้า)</Label>
              <Input
                value={settings.shift_label}
                onChange={(e) => setSettings({ ...settings, shift_label: e.target.value })}
                placeholder="เช่น รอบเช้า 19 ส.ค."
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant={settings.store_open ? "default" : "outline"}
                onClick={() => setSettings({ ...settings, store_open: !settings.store_open })}
              >
                {settings.store_open ? "หน้าร้านเปิดอยู่" : "หน้าร้านปิดอยู่"}
              </Button>
              <Button onClick={saveSettings}>บันทึก</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">ลูกค้าเข้าได้ทาง URL /store เท่านั้น และต้องกรอกรหัสผ่านนี้</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="font-semibold">ออเดอร์หน้าร้าน ({orders.length})</div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-14">ยังไม่มีออเดอร์หน้าร้าน</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-gradient-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg text-gradient-gold">{o.order_no}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("th-TH")}
                    {o.customer_name ? ` · ${o.customer_name}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      o.payment_status === "paid"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {o.payment_status === "paid" ? `ชำระแล้ว${o.paid_by ? ` (${o.paid_by})` : ""}` : "รอชำระเงิน"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                    {DELIVERY_LABEL[o.delivery_status] ?? "-"}
                  </span>
                  <span className="font-semibold text-gold">{Number(o.total).toLocaleString("th-TH")} ฿</span>
                </div>
              </div>

              <div className="space-y-1">
                {(o.store_order_items ?? []).map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary shrink-0">
                      {it.image_url && <img src={it.image_url} alt={it.product_name} className="w-full h-full object-cover" />}
                    </div>
                    <span className="flex-1 truncate">{it.product_name}</span>
                    <span className="text-muted-foreground">x{it.quantity}</span>
                    <span>{(Number(it.unit_price) * it.quantity).toLocaleString("th-TH")} ฿</span>
                  </div>
                ))}
              </div>
              {o.note && <p className="text-xs text-muted-foreground">หมายเหตุลูกค้า: {o.note}</p>}

              <div className="flex flex-wrap gap-2">
                {o.payment_status !== "paid" &&
                  (confirmFor === o.id ? (
                    <div className="flex items-center gap-2">
                      <PasswordInput
                        className="w-40"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value)}
                        placeholder="รหัสยืนยัน"
                      />
                      <Button size="sm" onClick={() => pay(o.id)}>
                        ยืนยัน
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmFor(null)}>
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setConfirmFor(o.id);
                        setConfirmCode("");
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" /> ยืนยันการชำระเงิน
                    </Button>
                  ))}

                {DELIVERY_OPTIONS.map((d) => (
                  <Button
                    key={d.value}
                    size="sm"
                    variant={o.delivery_status === d.value ? "default" : "outline"}
                    disabled={d.value === "delivered" && o.payment_status !== "paid"}
                    onClick={() => deliver(o.id, d.value)}
                  >
                    {d.value === "delivered" && <Truck className="w-4 h-4" />} {d.label}
                  </Button>
                ))}

                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(o.id)}>
                  <Trash2 className="w-4 h-4" /> ลบ
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
