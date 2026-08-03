import { supabase } from "@/integrations/supabase/client";

export type FulfillmentStatus =
  | "pending"
  | "acknowledged"
  | "finding"
  | "shipping"
  | "delivered"
  | "out_of_stock"
  | "unavailable"
  | "awaiting_preorder"
  | "problem"
  | "contact_admin"
  | "cancelled";

/** The 5 linear steps rendered as a progress bar. */
export const STATUS_FLOW: FulfillmentStatus[] = [
  "pending",
  "acknowledged",
  "finding",
  "shipping",
  "delivered",
];

/** Admin-settable special states, rendered outside the linear flow. */
export const SPECIAL_STATUSES: FulfillmentStatus[] = [
  "out_of_stock",
  "unavailable",
  "awaiting_preorder",
  "problem",
  "contact_admin",
  "cancelled",
];

export const STATUS_LABEL: Record<FulfillmentStatus, string> = {
  pending: "รอแอดมินรับ",
  acknowledged: "แอดมินรับแล้ว",
  finding: "กำลังหาของ",
  shipping: "กำลังจัดส่ง",
  delivered: "จัดส่งสำเร็จ",
  out_of_stock: "สินค้าหมด",
  unavailable: "ไม่มีสินค้า",
  awaiting_preorder: "รอสินค้า Pre-order",
  problem: "สินค้ามีปัญหา ติดต่อแอดมิน",
  contact_admin: "ติดต่อแอดมิน",
  cancelled: "ยกเลิกแล้ว",
};

export const STATUS_COLOR: Record<FulfillmentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  acknowledged: "bg-sky-500/15 text-sky-300",
  finding: "bg-violet-500/15 text-violet-300",
  shipping: "bg-blue-500/15 text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-400",
  out_of_stock: "bg-destructive/15 text-destructive",
  unavailable: "bg-destructive/15 text-destructive",
  awaiting_preorder: "bg-amber-500/15 text-amber-300",
  problem: "bg-destructive/15 text-destructive",
  contact_admin: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
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
  return_status?: string;
  return_reason?: string | null;
  returned_at?: string | null;
  order_payment_status?: string;
  order_created_at?: string;
  order_paid_from_balance?: boolean;
};

function pickImage(r: any): string | null {
  return r.product_image ?? r.products?.image_url ?? null;
}

/** All items still in the fulfillment pipeline (not yet delivered), oldest first. */
export async function fetchPendingQueue(): Promise<TrackingItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, return_status, return_reason, returned_at, products(image_url), orders!inner(user_id, profiles(username, roblox_name))",
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
    return_status: r.return_status ?? "none",
    return_reason: r.return_reason ?? null,
    returned_at: r.returned_at ?? null,
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
      "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, return_status, return_reason, returned_at, roblox_name, delivered_payload, products(image_url, claim_instructions, product_type), orders!inner(user_id, payment_status, created_at, paid_from_balance)",
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
    return_status: r.return_status ?? "none",
    return_reason: r.return_reason ?? null,
    returned_at: r.returned_at ?? null,
    roblox_name: r.roblox_name ?? null,
    delivered_payload: r.delivered_payload ?? null,
    claim_instructions: r.products?.claim_instructions ?? null,
    product_type: r.products?.product_type ?? "normal",
    order_payment_status: r.orders?.payment_status,
    order_created_at: r.orders?.created_at,
    order_paid_from_balance: r.orders?.paid_from_balance ?? false,
  }));
}

/** Search orders by receipt code or IP address (requirement 9.1). */
export async function fetchByReceiptIp(query: string): Promise<TrackingItem[]> {
  const q = query.trim();
  if (!q) return [];
  const { data: orders, error } = await (supabase as any)
    .from("orders")
    .select(
      "id, receipt_code, ip_address, created_at, payment_status, user_id, profiles(username), order_items(id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, return_status, return_reason, returned_at, roblox_name, delivered_payload)",
    )
    .or(`receipt_code.ilike.%${q}%,ip_address.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const out: TrackingItem[] = [];
  for (const o of orders ?? []) {
    for (const it of o.order_items ?? []) {
      out.push({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        product_name: it.product_name,
        product_image: it.product_image,
        unit_price: Number(it.unit_price),
        quantity: it.quantity,
        created_at: it.created_at,
        acknowledged: it.acknowledged,
        acknowledged_at: it.acknowledged_at,
        fulfillment_status: (it.fulfillment_status ?? "pending") as FulfillmentStatus,
        return_status: it.return_status ?? "none",
        return_reason: it.return_reason ?? null,
        returned_at: it.returned_at ?? null,
        roblox_name: it.roblox_name ?? null,
        delivered_payload: it.delivered_payload ?? null,
        user_id: o.user_id,
        username: o.profiles?.username ?? null,
        order_payment_status: o.payment_status,
        order_created_at: o.created_at,
      });
    }
  }
  return out;
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

export const RETURN_LABEL: Record<string, string> = {
  none: "",
  requested: "ขอคืนสินค้า/เงิน (รอแอดมิน)",
  approved: "คืนสำเร็จ",
  rejected: "ปฏิเสธการคืน",
};

/** Customer asks to return a delivered item. */
export async function requestReturn(itemId: string, reason: string) {
  const { error } = await supabase
    .from("order_items")
    .update({ return_status: "requested", return_reason: reason || null })
    .eq("id", itemId);
  if (error) throw error;
}

/** Customer asks for a refund while the item is still unacknowledged (requirement 9.3). */
export async function requestRefund(itemId: string) {
  const { data: item, error: ferr } = await supabase
    .from("order_items")
    .select("fulfillment_status")
    .eq("id", itemId)
    .single();
  if (ferr) throw ferr;
  if ((item as any)?.fulfillment_status !== "pending") {
    throw new Error("ขอคืนเงินได้เฉพาะรายการที่แอดมินยังไม่รับเท่านั้น");
  }
  const { error } = await supabase
    .from("order_items")
    .update({
      return_status: "requested",
      return_reason: "ขอคืนเงิน (แอดมินยังไม่รับ)",
    })
    .eq("id", itemId);
  if (error) throw error;
}

/** Cancel an order item, restoring stock. */
export async function cancelOrderItem(item: { id: string; product_id: string | null; quantity: number }) {
  const { error } = await supabase
    .from("order_items")
    .update({ fulfillment_status: "cancelled" })
    .eq("id", item.id);
  if (error) throw error;
  if (item.product_id) {
    await (supabase as any).rpc("adjust_product_stock", {
      _product_id: item.product_id,
      _delta: item.quantity,
    });
    await (supabase as any).rpc("bump_sold_count", {
      _product_id: item.product_id,
      _delta: -item.quantity,
    });
  }
}

/** Admin approves/rejects a return. Approving restores tracked stock and sold count. */
export async function resolveReturn(
  item: { id: string; product_id: string | null; quantity: number },
  approve: boolean,
) {
  const { error } = await supabase
    .from("order_items")
    .update({
      return_status: approve ? "approved" : "rejected",
      returned_at: approve ? new Date().toISOString() : null,
    })
    .eq("id", item.id);
  if (error) throw error;
  if (approve && item.product_id) {
    await (supabase as any).rpc("adjust_product_stock", {
      _product_id: item.product_id,
      _delta: item.quantity,
    });
    await (supabase as any).rpc("bump_sold_count", {
      _product_id: item.product_id,
      _delta: -item.quantity,
    });
  }
}

/** Mark an order as paid and auto-acknowledge its pending items (กดชำระแล้ว = แอดมินรับแล้ว). */
export async function markOrderPaid(orderId: string) {
  const { error: oerr } = await (supabase as any)
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId);
  if (oerr) throw oerr;
  const { error: ierr } = await supabase
    .from("order_items")
    .update({
      fulfillment_status: "acknowledged",
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("fulfillment_status", "pending");
  if (ierr) throw ierr;
}

/** Ms remaining out of the 24h unpaid window; 0 if expired or n/a. */
export function unpaidDeadline(order: { created_at: string; payment_status?: string }): number {
  if (order.payment_status && order.payment_status !== "unpaid") return 0;
  const deadline = new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000;
  return Math.max(0, deadline - Date.now());
}
