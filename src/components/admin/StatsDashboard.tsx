import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Trash2, Users, Wallet, ShoppingBag, Package, Eye } from "lucide-react";

type RangeKey = "today" | "7d" | "30d" | "1y" | "5y";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "today", label: "วันนี้", days: 1 },
  { key: "7d", label: "7 วัน", days: 7 },
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "1y", label: "1 ปี", days: 365 },
  { key: "5y", label: "5 ปี", days: 365 * 5 },
];

type BestSeller = { id: string; name: string; image_url: string | null; sold_count: number };
type CategoryViewRow = { category_id: string; name: string; count: number };

function fmt(n: number) {
  return n.toLocaleString("th-TH");
}

export function StatsDashboard() {
  const staff = getStaff();
  const isManager = staff?.role === "manager";

  const [range, setRange] = useState<RangeKey>("30d");
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [members, setMembers] = useState(0);
  const [topup, setTopup] = useState(0);
  const [spend, setSpend] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [visits, setVisits] = useState(0);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [categoryViews, setCategoryViews] = useState<CategoryViewRow[]>([]);

  const fromISO = useMemo(() => {
    const rangeDef = RANGES.find((r) => r.key === range)!;
    const from = new Date();
    from.setDate(from.getDate() - rangeDef.days);
    const bounds = [from.toISOString()];
    if (resetAt) bounds.push(resetAt);
    return bounds.sort().reverse()[0]; // the later (more restrictive) of the two
  }, [range, resetAt]);

  async function loadSettings() {
    const { data } = await supabase.from("site_settings").select("stats_reset_at").eq("id", 1).maybeSingle();
    setResetAt((data as any)?.stats_reset_at ?? null);
  }

  async function loadStats() {
    setLoading(true);
    try {
      const [
        { count: memberCount },
        { data: topupRows },
        { data: orderRows },
        { data: itemRows },
        { count: visitCount },
        { data: productRows },
        { data: catViewRows },
        { data: categories },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", fromISO),
        supabase.from("wallet_transactions").select("amount").eq("type", "topup").gte("created_at", fromISO),
        supabase.from("orders").select("total").gte("created_at", fromISO),
        supabase.from("order_items").select("quantity").gte("created_at", fromISO),
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("visited_at", fromISO),
        supabase.from("products").select("id, name, image_url, sold_count").order("sold_count", { ascending: false }).limit(10),
        (supabase as any).from("category_views").select("category_id").gte("created_at", fromISO),
        supabase.from("categories").select("id, name"),
      ]);

      setMembers(memberCount ?? 0);
      setTopup((topupRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));
      setSpend((orderRows ?? []).reduce((s: number, r: any) => s + Number(r.total || 0), 0));
      setItemsSold((itemRows ?? []).reduce((s: number, r: any) => s + Number(r.quantity || 0), 0));
      setVisits(visitCount ?? 0);
      setBestSellers(
        ((productRows ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          sold_count: p.sold_count ?? 0,
        }))
      );

      const catMap: Record<string, string> = {};
      ((categories ?? []) as any[]).forEach((c) => (catMap[c.id] = c.name));
      const counts: Record<string, number> = {};
      ((catViewRows ?? []) as any[]).forEach((r) => {
        counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
      });
      const cv = Object.entries(counts)
        .map(([category_id, count]) => ({ category_id, name: catMap[category_id] ?? "ไม่ทราบหมวดหมู่", count }))
        .sort((a, b) => b.count - a.count);
      setCategoryViews(cv);
    } catch (e: any) {
      toast.error("โหลดสถิติไม่สำเร็จ: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);
  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromISO]);

  async function resetStats() {
    if (!isManager) return;
    if (!confirm("รีเซ็ตสถิติทั้งหมด? การกระทำนี้จะนับสถิติใหม่จากเวลานี้")) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("site_settings").update({ stats_reset_at: now }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("รีเซ็ตสถิติแล้ว");
    setResetAt(now);
  }

  async function purgeOld() {
    if (!isManager) return;
    if (!confirm("ล้างข้อมูลสถิติที่เก่าเกิน 5 ปี? ไม่สามารถกู้คืนได้")) return;
    const { error } = await (supabase as any).rpc("purge_old_stats");
    if (error) return toast.error(error.message);
    toast.success("ล้างข้อมูลเก่าแล้ว");
    loadStats();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">สถิติเว็บไซต์</h2>
          <p className="text-xs text-muted-foreground">
            ข้อมูลสถิติจะถูกเก็บย้อนหลังสูงสุด 5 ปี ตามนโยบายการเก็บข้อมูล ระบบจะไม่แสดงหรือคำนวณข้อมูลที่เก่ากว่านี้
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isManager && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
          <Button size="sm" variant="destructive" onClick={resetStats}>
            <RefreshCw className="mr-1 h-4 w-4" /> รีเซ็ตสถิติ
          </Button>
          <Button size="sm" variant="outline" onClick={purgeOld}>
            <Trash2 className="mr-1 h-4 w-4" /> ล้างข้อมูลเกิน 5 ปี
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="สมาชิกทั้งหมด" value={fmt(members)} />
        <StatCard icon={Wallet} label="ยอดเติมเงินรวม" value={`฿${fmt(topup)}`} />
        <StatCard icon={ShoppingBag} label="ยอดใช้จ่ายรวม" value={`฿${fmt(spend)}`} />
        <StatCard icon={Package} label="สินค้าที่ขายได้" value={fmt(itemsSold)} />
        <StatCard icon={Eye} label="ยอดเข้าชม" value={fmt(visits)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สินค้าขายดี Top 10</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bestSellers.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
            {bestSellers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md border p-2">
                <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted" />
                )}
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className="text-sm font-semibold">{fmt(p.sold_count)} ชิ้น</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ยอดเข้าชมตามหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryViews.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
            {categoryViews.map((c) => (
              <div key={c.category_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-semibold">{fmt(c.count)} ครั้ง</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
