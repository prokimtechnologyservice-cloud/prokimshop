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

export type BoxTemplate = "default" | "neon" | "gold" | "ice" | "candy" | "dark";

export const BOX_TEMPLATES: {
  value: BoxTemplate;
  label: string;
  frameClass: string;
  bgClass: string;
  buttonClass: string;
  pointerClass: string;
}[] = [
  {
    value: "default",
    label: "ดั้งเดิม",
    frameClass: "border-2 border-gold/60 ring-4 ring-gold/40",
    bgClass: "bg-gradient-card",
    buttonClass: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black",
    pointerClass: "bg-gold shadow-[0_0_18px_rgba(255,215,0,0.9)]",
  },
  {
    value: "neon",
    label: "นีออน",
    frameClass: "border-2 border-fuchsia-500/70 ring-4 ring-fuchsia-500/40",
    bgClass: "bg-neutral-950",
    buttonClass: "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-primary-foreground",
    pointerClass: "bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.9)]",
  },
  {
    value: "gold",
    label: "ทองหรู",
    frameClass: "border-2 border-yellow-400/80 ring-4 ring-yellow-400/40",
    bgClass: "bg-gradient-to-b from-yellow-950 to-neutral-950",
    buttonClass: "bg-gradient-to-r from-yellow-400 to-amber-600 text-black",
    pointerClass: "bg-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.9)]",
  },
  {
    value: "ice",
    label: "น้ำแข็ง",
    frameClass: "border-2 border-sky-400/70 ring-4 ring-sky-400/40",
    bgClass: "bg-gradient-to-b from-sky-950 to-neutral-950",
    buttonClass: "bg-gradient-to-r from-sky-400 to-cyan-300 text-black",
    pointerClass: "bg-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.9)]",
  },
  {
    value: "candy",
    label: "แคนดี้",
    frameClass: "border-2 border-pink-400/70 ring-4 ring-pink-400/40",
    bgClass: "bg-gradient-to-b from-pink-950 to-violet-950",
    buttonClass: "bg-gradient-to-r from-pink-400 to-violet-400 text-primary-foreground",
    pointerClass: "bg-pink-300 shadow-[0_0_18px_rgba(244,114,182,0.9)]",
  },
  {
    value: "dark",
    label: "ดำมืด",
    frameClass: "border-2 border-neutral-700 ring-4 ring-neutral-800/60",
    bgClass: "bg-neutral-950",
    buttonClass: "bg-neutral-800 text-foreground border border-neutral-600",
    pointerClass: "bg-neutral-300 shadow-[0_0_14px_rgba(255,255,255,0.6)]",
  },
];

export function boxTemplate(v?: string | null) {
  return BOX_TEMPLATES.find((t) => t.value === v) ?? BOX_TEMPLATES[0];
}

export type BoxMode = "slide" | "wheel" | "drop";

export const BOX_MODES: { value: BoxMode; label: string }[] = [
  { value: "slide", label: "เลื่อนแนวนอน (เข็มกลาง)" },
  { value: "wheel", label: "วงล้อหมุน" },
  { value: "drop", label: "ไหลลงมา" },
];

export type BoxPrize = {
  id: string;
  prize_product_id: string | null;
  weight: number;
  stock: number;
  chance: number | null;
  is_nothing: boolean;
  label: string | null;
  image_url: string | null;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    product_type: string;
    stock: number | null;
  } | null;
};

export async function fetchBoxPrizes(boxId: string): Promise<BoxPrize[]> {
  const { data, error } = await (supabase as any)
    .from("mystery_box_items")
    .select(
      "id, prize_product_id, weight, stock, chance, is_nothing, label, image_url, products:prize_product_id(id, name, image_url, product_type, stock)",
    )
    .eq("box_product_id", boxId)
    .order("created_at");
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    prize_product_id: r.prize_product_id,
    weight: r.weight,
    stock: r.stock,
    chance: r.chance,
    is_nothing: !!r.is_nothing,
    label: r.label,
    image_url: r.image_url,
    product: r.products ?? null,
  }));
}

/**
 * Compute each prize's display percentage.
 * Prizes with an explicit `chance` keep it; the remainder of 100%
 * is split proportionally by `weight` across the rest.
 * Out-of-stock prizes (stock <= 0, not is_nothing) show 0%.
 */
export function effectiveChances(prizes: BoxPrize[]): number[] {
  const isOut = (p: BoxPrize) => !p.is_nothing && (p.stock ?? 0) <= 0;
  const explicitTotal = prizes.reduce(
    (s, p) => (!isOut(p) && p.chance != null ? s + Number(p.chance) : s),
    0,
  );
  const remainder = Math.max(0, 100 - explicitTotal);
  const weightPool = prizes.filter((p) => !isOut(p) && p.chance == null);
  const totalWeight = weightPool.reduce((s, p) => s + Math.max(1, p.weight || 1), 0);
  return prizes.map((p) => {
    if (isOut(p)) return 0;
    if (p.chance != null) return Number(p.chance);
    if (totalWeight <= 0) return 0;
    return (Math.max(1, p.weight || 1) / totalWeight) * remainder;
  });
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
    nothing?: boolean;
    prize_index: number;
    prize: { id: string | null; name: string; image_url: string | null; product_type: string | null };
    order_id: string | null;
    receipt_code: string | null;
    new_balance: number;
    delivered_payload: string | null;
  };
}
