import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  roblox_name?: string | null;
  farm_account_name?: string | null;
  farm_account_password?: string | null;
};

export async function fetchCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id, product_id, product_name, unit_price, quantity, roblox_name, farm_account_name, farm_account_password",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d: any) => ({ ...d, unit_price: Number(d.unit_price) }));
}

export async function addToCart(
  userId: string,
  product: { id: string; name: string; price: number },
  roblox_name?: string | null,
  farm?: { farm_account_name: string; farm_account_password: string } | null,
) {
  // merge only when same product AND same roblox_name
  // NOTE: compare roblox_name in JS — names may contain special characters that
  // break PostgREST filter values (commas, quotes, parentheses) and would
  // silently mismatch, causing the saved name to look "reset".
  const wanted = roblox_name?.trim() ? roblox_name.trim() : null;
  const { data: rows } = await supabase
    .from("cart_items")
    .select("id, quantity, roblox_name, farm_account_name")
    .eq("user_id", userId)
    .eq("product_id", product.id);
  // farm items carry per-order credentials, so they never merge
  const existing = farm
    ? null
    : (rows ?? []).find(
        (r: any) =>
          ((r.roblox_name ?? "").trim() || null) === wanted && !r.farm_account_name,
      ) ?? null;


  if (existing) {
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart_items").insert({
      user_id: userId,
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: 1,
      roblox_name: wanted,
      farm_account_name: farm?.farm_account_name ?? null,
      farm_account_password: farm?.farm_account_password ?? null,
    });
  }
  window.dispatchEvent(new Event("cart-change"));
}


export async function removeCartItem(id: string) {
  await supabase.from("cart_items").delete().eq("id", id);
  window.dispatchEvent(new Event("cart-change"));
}

export async function updateQty(id: string, qty: number) {
  if (qty <= 0) return removeCartItem(id);
  await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
  window.dispatchEvent(new Event("cart-change"));
}

export async function clearCart(userId: string) {
  await supabase.from("cart_items").delete().eq("user_id", userId);
  window.dispatchEvent(new Event("cart-change"));
}

export async function checkoutCart(
  userId: string,
  items: CartItem[],
  pay_from_balance = false,
  clientToken?: string,
) {
  const res = await fetch("/api/public/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      pay_from_balance,
      client_token: clientToken ?? crypto.randomUUID(),
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        roblox_name: i.roblox_name ?? null,
        farm_account_name: i.farm_account_name ?? null,
        farm_account_password: i.farm_account_password ?? null,
      })),

    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "checkout failed");
  return { id: j.id as string, receipt_code: j.receipt_code as string };
}


export const ADMIN_CHAT_URL = "https://m.me/61580581317954";
