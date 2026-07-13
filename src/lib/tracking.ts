import { supabase } from "@/integrations/supabase/client";

export type FulfillmentStatus =
  | "pending"
  | "acknowledged"
  | "finding"
  | "shipping"
  | "delivered";

export const STATUS_FLOW: FulfillmentStatus[] = [
  "pending",
  "acknowledged",
  "finding",
  "shipping",
  "delivered",
];

export const STATUS_LABEL: Record<FulfillmentStatus, string> = {
  pending: "รอแอดมินรับ",
  acknowledged: "แอดมินรับแล้ว",
  finding: "กำลังหาของ",
  shipping: "กำลังจัดส่ง",
  delivered: "จัดส่งสำเร็จ",
};

export const STATUS_COLOR: Record<FulfillmentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  acknowledged: "bg-sky-500/15 text-sky-300",
  finding: "bg-violet-500/15 text-violet-300",
  shipping: "bg-blue-500/15 text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-400",
};

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
  fulfillment_status: FulfillmentStatus;
  user_id?: string;
  username?: string | null;
  roblox_name?: string | null;
  delivered_payload?: string | null;
  claim_instructions?: string | null;
  product_type?: string;
};

function pickImage(r: any): string | null {
  return r.product_image ?? r.products?.image_url ?? null;
}

/** All items still in the fulfillment pipeline (not yet delivered), oldest first. */
export async function fetchPendingQueue(): Promise<TrackingItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, products(image_url), orders!inner(user_id, profiles(username, roblox_name))",
    )
    .neq("fulfillment_status", "delivered")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    product_id: r.product_id,
    product_name: r.product_name,
    product_image: pickImage(r),
    unit_price: Number(r.unit_price),
    quantity: r.quantity,
    created_at: r.created_at,
    acknowledged: r.acknowledged,
    acknowledged_at: r.acknowledged_at,
    fulfillment_status: (r.fulfillment_status ?? "pending") as FulfillmentStatus,
    user_id: r.orders?.user_id,
    username: r.orders?.profiles?.username ?? null,
    roblox_name: r.orders?.profiles?.roblox_name ?? null,
  }));
}

/** Items for a specific user, newest first. */
export async function fetchUserTracking(userId: string): Promise<TrackingItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, roblox_name, delivered_payload, products(image_url, claim_instructions, product_type), orders!inner(user_id)",
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
    product_image: pickImage(r),
    unit_price: Number(r.unit_price),
    quantity: r.quantity,
    created_at: r.created_at,
    acknowledged: r.acknowledged,
    acknowledged_at: r.acknowledged_at,
    fulfillment_status: (r.fulfillment_status ?? "pending") as FulfillmentStatus,
    roblox_name: r.roblox_name ?? null,
    delivered_payload: r.delivered_payload ?? null,
    claim_instructions: r.products?.claim_instructions ?? null,
    product_type: r.products?.product_type ?? "normal",
  }));
}

export async function setFulfillmentStatus(
  itemId: string,
  status: FulfillmentStatus,
  staffId?: string | null,
) {
  const base = {
    fulfillment_status: status,
    acknowledged: status !== "pending",
    acknowledged_at: status === "pending" ? null : new Date().toISOString(),
    acknowledged_by:
      status === "pending" ? null : staffId ?? null,
  };
  const { error } = await supabase.from("order_items").update(base).eq("id", itemId);
  if (error) throw error;
}
