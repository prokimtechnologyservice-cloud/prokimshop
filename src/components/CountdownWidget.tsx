import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Timer } from "lucide-react";

type Countdown = {
  id: string;
  title: string;
  description: string | null;
  ends_at: string;
  active: boolean;
};

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function CountdownCard({ c }: { c: Countdown }) {
  const [left, setLeft] = useState(() => timeLeft(c.ends_at));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(c.ends_at)), 1000);
    return () => clearInterval(id);
  }, [c.ends_at]);

  if (!left) return null;

  return (
    <div className="rounded-xl border border-gold/40 bg-gradient-card shadow-luxe p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="w-5 h-5 text-gold shrink-0" />
        <div className="min-w-0">
          <div className="font-display text-lg truncate">{c.title}</div>
          {c.description && (
            <div className="text-xs text-muted-foreground line-clamp-2">{c.description}</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { v: left.days, l: "วัน" },
          { v: left.hours, l: "ชม." },
          { v: left.minutes, l: "นาที" },
          { v: left.seconds, l: "วินาที" },
        ].map((x) => (
          <div key={x.l} className="rounded-lg bg-onyx/60 border border-border py-2">
            <div className="font-display text-xl text-gold">{String(x.v).padStart(2, "0")}</div>
            <div className="text-[10px] text-muted-foreground">{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountdownWidget() {
  const [rows, setRows] = useState<Countdown[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("countdowns")
        .select("*")
        .eq("active", true)
        .order("ends_at");
      setRows((data as Countdown[]) ?? []);
    })();
  }, []);

  const active = rows.filter((r) => new Date(r.ends_at).getTime() - Date.now() > 0);
  if (active.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {active.map((c) => (
          <CountdownCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}
