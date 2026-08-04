import { supabase } from "@/integrations/supabase/client";

export type AuctionBid = {
  id: string;
  user_id: string;
  amount: number;
  roblox_name: string | null;
  created_at: string;
  username?: string | null;
};

export type AuctionInfo = {
  top: number | null;
  minNext: number;
  bids: AuctionBid[];
};

export async function fetchAuction(
  product: {
    id: string;
    auction_start_price: number;
    auction_step: number;
  },
): Promise<AuctionInfo> {
  const { data } = await (supabase as any)
    .from("auction_bids")
    .select("id, user_id, amount, roblox_name, created_at, profiles(username)")
    .eq("product_id", product.id)
    .order("amount", { ascending: false })
    .limit(100);
  const bids: AuctionBid[] = ((data as any[]) ?? []).map((b) => ({
    id: b.id,
    user_id: b.user_id,
    amount: Number(b.amount),
    roblox_name: b.roblox_name ?? null,
    created_at: b.created_at,
    username: b.profiles?.username ?? null,
  }));
  const top = bids.length ? bids[0].amount : null;
  const step = Number(product.auction_step) || 1;
  const minNext = top == null ? Number(product.auction_start_price) : top + step;
  return { top, minNext, bids };
}

/**
 * Deduplicate bids by user_id, keeping the highest amount for each user.
 * Returns sorted by amount descending.
 */
export function topBidsByUser(bids: AuctionBid[]): AuctionBid[] {
  const map = new Map<string, AuctionBid>();
  for (const b of bids) {
    const existing = map.get(b.user_id);
    if (!existing || b.amount > existing.amount) {
      map.set(b.user_id, b);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export async function placeBid(
  productId: string,
  userId: string,
  amount: number,
  robloxName: string | null,
) {
  const res = await fetch("/api/public/auction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bid",
      product_id: productId,
      user_id: userId,
      amount,
      roblox_name: robloxName,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "bid failed");
  return j as { ok: true; amount: number; next_min: number };
}

/** Ask the server to close any auction whose deadline has passed. */
export async function settleAuctions() {
  try {
    await fetch("/api/public/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle" }),
    });
  } catch {
    /* ignore */
  }
}

export function auctionCountdown(endsAt?: string | null): string {
  if (!endsAt) return "ไม่กำหนดเวลา";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ปิดประมูลแล้ว";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} วัน ${h} ชม.`;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
