import { supabase } from "@/integrations/supabase/client";

export type BoxColor =
  | "default"
  | "green"
  | "blue"
  | "white"
  | "red"
  | "black"
  | "purple"
  | "pink"
  | "orange"
  | "yellow"
  | "navy";

export const BOX_COLOR_OPTIONS: { value: BoxColor; label: string; swatch: string }[] = [
  { value: "default", label: "ดั้งเดิม (ทอง)", swatch: "bg-amber-400" },
  { value: "green", label: "เขียว", swatch: "bg-emerald-500" },
  { value: "blue", label: "ฟ้า", swatch: "bg-sky-500" },
  { value: "white", label: "ขาว", swatch: "bg-white" },
  { value: "red", label: "แดง", swatch: "bg-red-500" },
  { value: "black", label: "ดำ", swatch: "bg-black" },
  { value: "purple", label: "ม่วง", swatch: "bg-violet-500" },
  { value: "pink", label: "ชมพู", swatch: "bg-pink-500" },
  { value: "orange", label: "ส้ม", swatch: "bg-orange-500" },
  { value: "yellow", label: "เหลือง", swatch: "bg-yellow-400" },
  { value: "navy", label: "น้ำเงิน", swatch: "bg-blue-800" },
];

export const BORDER_CLASS: Record<BoxColor, string> = {
  default: "border-gold/60",
  green: "border-emerald-500/70",
  blue: "border-sky-500/70",
  white: "border-white/80",
  red: "border-red-500/70",
  black: "border-neutral-800",
  purple: "border-violet-500/70",
  pink: "border-pink-500/70",
  orange: "border-orange-500/70",
  yellow: "border-yellow-400/80",
  navy: "border-blue-800/80",
};

export const BG_CLASS: Record<BoxColor, string> = {
  default: "bg-gradient-card",
  green: "bg-emerald-950/70",
  blue: "bg-sky-950/70",
  white: "bg-white/90 text-neutral-900",
  red: "bg-red-950/70",
  black: "bg-neutral-950",
  purple: "bg-violet-950/70",
  pink: "bg-pink-950/60",
  orange: "bg-orange-950/70",
  yellow: "bg-yellow-950/60",
  navy: "bg-blue-950/80",
};

export const RING_CLASS: Record<BoxColor, string> = {
  default: "ring-gold/50",
  green: "ring-emerald-500/60",
  blue: "ring-sky-500/60",
  white: "ring-white/70",
  red: "ring-red-500/60",
  black: "ring-neutral-700",
  purple: "ring-violet-500/60",
  pink: "ring-pink-500/60",
  orange: "ring-orange-500/60",
  yellow: "ring-yellow-400/70",
  navy: "ring-blue-700/70",
};

export function boxColor(v?: string | null): BoxColor {
  const s = (v ?? "default") as BoxColor;
  return (BORDER_CLASS as any)[s] ? s : "default";
}

export type BoxPrize = {
  id: string;
  prize_product_id: string;
  weight: number;
  stock: number;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    product_type: string;
  };
};

export async function fetchBoxPrizes(boxId: string): Promise<BoxPrize[]> {
  const { data, error } = await (supabase as any)
    .from("mystery_box_items")
    .select("id, prize_product_id, weight, stock, products:prize_product_id(id, name, image_url, product_type)")
    .eq("box_product_id", boxId)
    .order("created_at");
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    prize_product_id: r.prize_product_id,
    weight: r.weight,
    stock: r.stock,
    product: r.products,
  }));
}

export async function spinBox(
  userId: string,
  boxProductId: string,
  robloxName: string | null,
) {
  const res = await fetch("/api/public/spin-box", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, box_product_id: boxProductId, roblox_name: robloxName }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "spin failed");
  return j as {
    prize: { id: string; name: string; image_url: string | null; product_type: string };
    order_id: string;
    receipt_code: string;
    new_balance: number;
    delivered_payload: string | null;
  };
}
