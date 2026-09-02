import { supabase } from "@/integrations/supabase/client";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Normalize/auto-format a gift card code as the user types it (unlimited length). */
export function normalizeCode(input: string): string {
  let s = (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  // force it to start with PS
  if (!s.startsWith("PS")) {
    // if user typed something not starting with PS, strip leading non-PS then prefix
    s = "PS" + s.replace(/^PS/, "");
  }
  const rest = s.slice(2); // no length limit — codes may be any length
  const blocks: string[] = [];
  for (let i = 0; i < rest.length; i += 4) blocks.push(rest.slice(i, i + 4));
  return ["PS", ...blocks].join("-");
}

export function isCompleteCode(code: string): boolean {
  return /^PS(-[A-Z0-9]{1,4})+$/.test(code) && code.replace(/[^A-Z0-9]/g, "").length >= 6;
}


export function randomCode(): string {
  let rest = "";
  for (let i = 0; i < 16; i++) rest += CHARS[Math.floor(Math.random() * CHARS.length)];
  return normalizeCode("PS" + rest);
}

export type RedeemResult = {
  label: string | null;
  image_url: string | null;
  description: string | null;
  balance: number;
  new_balance: number;
  promotion_id: string | null;
  product_ids: string[] | null;
};

export async function redeemGiftCard(code: string, userId: string): Promise<RedeemResult> {
  const { data, error } = await (supabase as any).rpc("redeem_gift_card", {
    _code: code,
    _user_id: userId,
  });
  if (error) throw new Error(error.message || "ไม่สามารถใช้บัตรของขวัญได้");
  return data as RedeemResult;
}

export type GiftCard = {
  id: string;
  code: string;
  label: string | null;
  image_url: string | null;
  description: string | null;
  reward_balance: number;
  reward_product_ids: string[] | null;
  reward_promotion_id: string | null;
  used_by: string | null;
  used_at: string | null;
  active: boolean;
  created_at: string;
};

export async function listGiftCards(): Promise<GiftCard[]> {
  const { data, error } = await (supabase as any)
    .from("gift_cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GiftCard[]) ?? [];
}

export async function createGiftCard(payload: Partial<GiftCard>): Promise<GiftCard> {
  const { data, error } = await (supabase as any)
    .from("gift_cards")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as GiftCard;
}

export async function deleteGiftCard(id: string): Promise<void> {
  const { error } = await (supabase as any).from("gift_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function setGiftCardActive(id: string, active: boolean): Promise<void> {
  const { error } = await (supabase as any).from("gift_cards").update({ active }).eq("id", id);
  if (error) throw error;
}
