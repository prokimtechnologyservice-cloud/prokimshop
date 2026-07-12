import { supabase } from "@/integrations/supabase/client";

export type TrackingItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  created_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  user_id?: string;
  username?: string | null;
  roblox_name?: string | null;
};

/** All pending items in queue, oldest first (position = index+1). */
export async function fetchPendingQueue(): Promise<TrackingItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, orders!inner(user_id, profiles(username, roblox_name))",
    )
    .eq("acknowledged", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    product_id: r.product_id,
    product_name: r.product_name,
    product_image: r.product_image,
    unit_price: Number(r.unit_price),
    quantity: r.quantity,
    created_at: r.created_at,
    acknowledged: r.acknowledged,
    acknowledged_at: r.acknowledged_at,
    user_id: r.orders?.user_id,
    username: r.orders?.profiles?.username ?? null,
    roblox_name: r.orders?.profiles?.roblox_name ?? null,
  }));
}

/** Items for a specific user (both pending and acknowledged), newest first. */
export async function fetchUserTracking(userId: string): Promise<TrackingItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, orders!inner(user_id)",
    )
    .eq("orders.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    product_id: r.product_id,
    product_name: r.product_name,
    product_image: r.product_image,
    unit_price: Number(r.unit_price),
    quantity: r.quantity,
    created_at: r.created_at,
    acknowledged: r.acknowledged,
    acknowledged_at: r.acknowledged_at,
  }));
}

export async function acknowledgeItem(itemId: string, staffId: string) {
  const { error } = await supabase
    .from("order_items")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: staffId,
    })
    .eq("id", itemId);
  if (error) throw error;
}

export async function unacknowledgeItem(itemId: string) {
  const { error } = await supabase
    .from("order_items")
    .update({ acknowledged: false, acknowledged_at: null, acknowledged_by: null })
    .eq("id", itemId);
  if (error) throw error;
}
