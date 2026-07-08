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

export async function checkoutCart(userId: string, items: CartItem[]) {
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: userId, total, status: "pending" })
    .select("id, receipt_code")
    .single();
  if (error) throw error;

  await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    })),
  );
  return { id: order.id as string, receipt_code: (order as any).receipt_code as string };
}

export const ADMIN_CHAT_URL = "https://m.me/61580581317954";
