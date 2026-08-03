import { supabase } from "@/integrations/supabase/client";

export type Promotion = {
  id: string;
  kind: "discount" | "promotion";
  name: string;
  code: string | null;
  image_url: string | null;
  description: string | null;
  discount_type: "amount" | "percent" | "bogo";
  discount_value: number;
  buy_qty: number | null;
  get_qty: number | null;
  applies_to: "all" | "products" | "categories";
  product_ids: string[] | null;
  category_ids: string[] | null;
  min_subtotal: number | null;
  max_subtotal: number | null;
  apply_on: "receipt" | "items";
  valid_days: number | null;
  starts_at: string | null;
  ends_at: string | null;
  grant_rule: "manual" | "all" | "new_user" | "topup_over" | "spend_over" | "order_count";
  grant_value: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPromotion = {
  id: string;
  promotion_id: string;
  user_id: string;
  expires_at: string | null;
  used_at: string | null;
  order_id: string | null;
  created_at: string;
};

export type CartComputeItem = {
  product_id: string | null;
  category_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export async function listPromotions(kind?: "discount" | "promotion"): Promise<Promotion[]> {
  let q = (supabase as any).from("promotions").select("*").order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function createPromotion(p: Partial<Promotion>) {
  const { data, error } = await (supabase as any).from("promotions").insert(p).select("*").single();
  if (error) throw error;
  return data as Promotion;
}

export async function updatePromotion(id: string, p: Partial<Promotion>) {
  const { data, error } = await (supabase as any).from("promotions").update(p).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Promotion;
}

export async function deletePromotion(id: string) {
  const { error } = await (supabase as any).from("promotions").delete().eq("id", id);
  if (error) throw error;
}

export async function grantPromotion(promotionId: string, userIds: string[], validDays?: number | null) {
  if (!userIds.length) return;
  const expiresAt = validDays
    ? new Date(Date.now() + validDays * 86400000).toISOString()
    : null;
  const rows = userIds.map((uid) => ({
    promotion_id: promotionId,
    user_id: uid,
    expires_at: expiresAt,
  }));
  const { error } = await (supabase as any)
    .from("user_promotions")
    .upsert(rows, { onConflict: "promotion_id,user_id", ignoreDuplicates: true });
  if (error) throw error;
}

async function getPromotionValidDays(promotionId: string): Promise<number | null> {
  const { data } = await (supabase as any)
    .from("promotions")
    .select("valid_days")
    .eq("id", promotionId)
    .maybeSingle();
  return data?.valid_days ?? null;
}

export async function grantPromotionToAll(promotionId: string) {
  const validDays = await getPromotionValidDays(promotionId);
  const userIds = await audienceAllUsers();
  await grantPromotion(promotionId, userIds, validDays);
}

export async function audienceAllUsers(): Promise<string[]> {
  const { data, error } = await (supabase as any).from("profiles").select("id");
  if (error) throw error;
  return (data ?? []).map((d: any) => d.id);
}

export async function audienceNewUsers(): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", since);
  if (error) throw error;
  return (data ?? []).map((d: any) => d.id);
}

export async function audienceTopupOver(minTotal: number): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from("wallet_transactions")
    .select("user_id, amount, type")
    .eq("type", "topup");
  if (error) throw error;
  const sums: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    sums[r.user_id] = (sums[r.user_id] ?? 0) + Number(r.amount ?? 0);
  });
  return Object.entries(sums)
    .filter(([, sum]) => sum >= minTotal)
    .map(([uid]) => uid);
}

export async function audienceSpendOver(minTotal: number): Promise<string[]> {
  const { data, error } = await (supabase as any).from("orders").select("user_id, total");
  if (error) throw error;
  const sums: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    if (!r.user_id) return;
    sums[r.user_id] = (sums[r.user_id] ?? 0) + Number(r.total ?? 0);
  });
  return Object.entries(sums)
    .filter(([, sum]) => sum >= minTotal)
    .map(([uid]) => uid);
}

export async function audienceOrderCountOver(minCount: number): Promise<string[]> {
  const { data, error } = await (supabase as any).from("orders").select("user_id");
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    if (!r.user_id) return;
    counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
  });
  return Object.entries(counts)
    .filter(([, c]) => c >= minCount)
    .map(([uid]) => uid);
}

export async function fetchMyPromotions(userId: string): Promise<(UserPromotion & { promotion: Promotion })[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from("user_promotions")
    .select("*, promotion:promotions(*)")
    .eq("user_id", userId)
    .is("used_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter(
    (r: any) =>
      r.promotion &&
      r.promotion.active &&
      (!r.expires_at || r.expires_at > nowIso),
  ) as any;
}

// category ancestor check: given item's category_id, does it match target (self or ancestor)?
async function categoryMatchesAny(
  itemCategoryId: string | null | undefined,
  targetCategoryIds: string[],
): Promise<boolean> {
  if (!itemCategoryId) return false;
  if (targetCategoryIds.includes(itemCategoryId)) return true;
  // walk up parent chain
  let current = itemCategoryId;
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    if (seen.has(current)) break;
    seen.add(current);
    const { data } = await (supabase as any)
      .from("categories")
      .select("parent_id")
      .eq("id", current)
      .maybeSingle();
    const parentId = data?.parent_id;
    if (!parentId) break;
    if (targetCategoryIds.includes(parentId)) return true;
    current = parentId;
  }
  return false;
}

export type DiscountResult = { discount: number; freeQty: number; reason: string };

export function computeDiscount(promo: Promotion, items: CartComputeItem[]): DiscountResult {
  const cartSubtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const eligibleItems = items.filter((it) => {
    if (promo.applies_to === "all") return true;
    if (promo.applies_to === "products") {
      return !!it.product_id && (promo.product_ids ?? []).includes(it.product_id);
    }
    if (promo.applies_to === "categories") {
      const catIds = promo.category_ids ?? [];
      if (!it.category_id) return false;
      return catIds.includes(it.category_id);
    }
    return false;
  });

  const eligibleSubtotal = eligibleItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const relevantSubtotal = promo.apply_on === "receipt" ? cartSubtotal : eligibleSubtotal;

  if (promo.min_subtotal != null && relevantSubtotal < Number(promo.min_subtotal)) {
    return { discount: 0, freeQty: 0, reason: `ยอดขั้นต่ำ ฿${promo.min_subtotal} ยังไม่ถึง` };
  }
  if (promo.max_subtotal != null && relevantSubtotal > Number(promo.max_subtotal)) {
    return { discount: 0, freeQty: 0, reason: `ยอดเกิน ฿${promo.max_subtotal} ไม่สามารถใช้โค้ดนี้ได้` };
  }
  if (eligibleItems.length === 0 && promo.applies_to !== "all") {
    return { discount: 0, freeQty: 0, reason: "ไม่มีสินค้าที่เข้าเงื่อนไขในตะกร้า" };
  }

  if (promo.discount_type === "amount") {
    const discount = Math.min(Number(promo.discount_value ?? 0), eligibleSubtotal);
    return { discount, freeQty: 0, reason: "" };
  }

  if (promo.discount_type === "percent") {
    const discount = (eligibleSubtotal * Number(promo.discount_value ?? 0)) / 100;
    return { discount: Math.min(discount, eligibleSubtotal), freeQty: 0, reason: "" };
  }

  if (promo.discount_type === "bogo") {
    const buyQty = Math.max(1, Number(promo.buy_qty ?? 1));
    const getQty = Math.max(1, Number(promo.get_qty ?? 1));
    // Expand eligible items into unit prices, cheapest-first for free selection
    const units: number[] = [];
    eligibleItems.forEach((it) => {
      for (let i = 0; i < it.quantity; i++) units.push(it.unit_price);
    });
    const totalUnits = units.length;
    const groups = Math.floor(totalUnits / (buyQty + getQty));
    const freeCount = groups * getQty;
    if (freeCount <= 0) {
      return { discount: 0, freeQty: 0, reason: "จำนวนสินค้ายังไม่ครบตามเงื่อนไขโปรโมชั่น" };
    }
    const sorted = [...units].sort((a, b) => a - b);
    const freeUnits = sorted.slice(0, freeCount);
    const discount = freeUnits.reduce((s, p) => s + p, 0);
    return { discount, freeQty: freeCount, reason: "" };
  }

  return { discount: 0, freeQty: 0, reason: "ไม่สามารถใช้โปรโมชั่นนี้ได้" };
}

export async function validatePromoCode(
  code: string,
  userId: string,
  items: CartComputeItem[],
): Promise<(DiscountResult & { promotion: Promotion }) | { error: string }> {
  const normalized = code.trim();
  if (!normalized) return { error: "กรุณากรอกโค้ด" };
  const { data: promo, error } = await (supabase as any)
    .from("promotions")
    .select("*")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle();
  if (error || !promo) return { error: "ไม่พบโค้ดนี้ หรือโค้ดหมดอายุ" };

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) return { error: "โค้ดนี้ยังไม่เริ่มใช้งาน" };
  if (promo.ends_at && new Date(promo.ends_at) < now) return { error: "โค้ดนี้หมดอายุแล้ว" };

  if (promo.grant_rule !== "all") {
    const { data: grant } = await (supabase as any)
      .from("user_promotions")
      .select("*")
      .eq("promotion_id", promo.id)
      .eq("user_id", userId)
      .is("used_at", null)
      .maybeSingle();
    if (!grant) return { error: "คุณไม่มีสิทธิ์ใช้โค้ดนี้" };
    if (grant.expires_at && new Date(grant.expires_at) < now) return { error: "สิทธิ์การใช้โค้ดนี้หมดอายุแล้ว" };
  }

  const result = computeDiscount(promo as Promotion, items);
  if (result.discount <= 0 && result.reason) return { error: result.reason };
  return { ...result, promotion: promo as Promotion };
}
