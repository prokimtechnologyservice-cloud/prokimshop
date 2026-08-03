import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wallet, ShoppingBag, Signal } from "lucide-react";

type Stats = {
  online: number;
  users: number;
  topup: number;
  sold: number;
};

async function computeLiveStats(resetAt: string | null): Promise<Stats> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const onlineQ = (supabase as any)
    .from("visits")
    .select("session_key")
    .gte("created_at", fiveMinAgo);

  let usersQ = (supabase as any).from("profiles").select("id", { count: "exact", head: true });
  let topupQ = (supabase as any).from("wallet_transactions").select("amount").eq("type", "topup");
  let soldQ = (supabase as any).from("order_items").select("quantity");

  if (resetAt) {
    usersQ = usersQ.gte("created_at", resetAt);
    topupQ = topupQ.gte("created_at", resetAt);
    soldQ = soldQ.gte("created_at", resetAt);
  }

  const [{ data: visits }, { count: userCount }, { data: topups }, { data: items }] =
    await Promise.all([onlineQ, usersQ, topupQ, soldQ]);

  const online = new Set(((visits as any[]) ?? []).map((v) => v.session_key)).size;
  const topup = ((topups as any[]) ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const sold = ((items as any[]) ?? []).reduce((a, b) => a + Number(b.quantity ?? 0), 0);

  return { online, users: userCount ?? 0, topup, sold };
}

export function HomeStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: s } = await (supabase as any)
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (!alive) return;
      if (s?.stats_manual) {
        setStats({
          online: Number(s.stat_online ?? 0),
          users: Number(s.stat_users ?? 0),
          topup: Number(s.stat_topup ?? 0),
          sold: Number(s.stat_sold ?? 0),
        });
      } else {
        const live = await computeLiveStats(s?.stats_reset_at ?? null);
        if (alive) setStats(live);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = [
    { label: "ผู้ใช้ออนไลน์", value: stats?.online ?? 0, icon: Signal },
    { label: "สมาชิกทั้งหมด", value: stats?.users ?? 0, icon: Users },
    {
      label: "ยอดเติมเงินรวม",
      value: `฿${(stats?.topup ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`,
      icon: Wallet,
    },
    { label: "สินค้าที่ขายแล้ว", value: stats?.sold ?? 0, icon: ShoppingBag },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border border-border bg-gradient-card p-4 flex flex-col items-center text-center gap-1 shadow-card"
          >
            <it.icon className="w-5 h-5 text-gold" />
            <div className="font-display text-lg sm:text-xl text-gradient-gold">
              {typeof it.value === "number" ? it.value.toLocaleString("th-TH") : it.value}
            </div>
            <div className="text-[11px] text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
