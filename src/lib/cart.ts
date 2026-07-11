import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export async function fetchCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("id, product_id, product_name, unit_price, quantity")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({ ...d, unit_price: Number(d.unit_price) }));
}

export async function addToCart(
  userId: string,
  product: { id: string; name: string; price: number },
) {
  // merge if same product
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

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
) {
  const res = await fetch("/api/public/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      pay_from_balance,
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
      })),
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "checkout failed");
  return { id: j.id as string, receipt_code: j.receipt_code as string };
}

export const ADMIN_CHAT_URL = "https://m.me/61580581317954";
