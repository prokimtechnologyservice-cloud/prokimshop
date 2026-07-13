import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function getIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/public/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            user_id: string;
            items: {
              product_id: string | null;
              product_name: string;
              unit_price: number;
              quantity: number;
              roblox_name?: string | null;
            }[];
            pay_from_balance: boolean;
          };
          if (!body?.user_id || !Array.isArray(body.items) || body.items.length === 0) {
            return Response.json({ error: "invalid" }, { status: 400 });
          }
          const ip = getIp(request);
          const total = body.items.reduce(
            (s, i) => s + Number(i.unit_price) * Number(i.quantity),
            0,
          );
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );

          // Preflight: check account (ไก่ตัน) stock availability
          const productIds = Array.from(
            new Set(body.items.map((i) => i.product_id).filter(Boolean) as string[]),
          );
          const prodMap = new Map<string, { image_url: string | null; product_type: string }>();
          if (productIds.length) {
            const { data: prods } = await admin
              .from("products")
              .select("id, image_url, product_type")
              .in("id", productIds);
            (prods ?? []).forEach((p: any) =>
              prodMap.set(p.id, {
                image_url: p.image_url ?? null,
                product_type: p.product_type ?? "normal",
              }),
            );
          }

          // Determine how many "account" units needed per product
          const needAccount: Record<string, number> = {};
          for (const it of body.items) {
            if (!it.product_id) continue;
            if (prodMap.get(it.product_id)?.product_type === "account") {
              needAccount[it.product_id] = (needAccount[it.product_id] ?? 0) + it.quantity;
            }
          }
          // Fetch available stock and pre-reserve rows to hand out
          const reservations: Record<string, { id: string; payload: string }[]> = {};
          for (const [pid, qty] of Object.entries(needAccount)) {
            const { data: avail, error: aerr } = await admin
              .from("product_account_stock")
              .select("id, payload")
              .eq("product_id", pid)
              .eq("status", "available")
              .order("created_at", { ascending: true })
              .limit(qty);
            if (aerr) throw aerr;
            if (!avail || avail.length < qty) {
              return Response.json(
                { error: "สินค้าบัญชีบางรายการหมดสต็อก กรุณารีเฟรชและลองใหม่" },
                { status: 400 },
              );
            }
            reservations[pid] = avail as any[];
          }

          // Create order
          const { data: order, error } = await admin
            .from("orders")
            .insert({
              user_id: body.user_id,
              total,
              status: "pending",
              ip_address: ip,
              paid_from_balance: body.pay_from_balance,
              payment_status: body.pay_from_balance ? "paid" : "unpaid",
            })
            .select("id, receipt_code")
            .single();
          if (error) throw error;

          // Build order_items — expand account-type into individual rows so each row
          // carries its own delivered_payload
          const rows: any[] = [];
          for (const it of body.items) {
            const info = it.product_id ? prodMap.get(it.product_id) : undefined;
            const isAccount = info?.product_type === "account";
            if (isAccount && it.product_id) {
              const pool = reservations[it.product_id];
              for (let k = 0; k < it.quantity; k++) {
                const acct = pool.shift();
                rows.push({
                  order_id: order.id,
                  product_id: it.product_id,
                  product_name: it.product_name,
                  product_image: info?.image_url ?? null,
                  unit_price: it.unit_price,
                  quantity: 1,
                  roblox_name: it.roblox_name ?? null,
                  delivered_payload: acct?.payload ?? null,
                });
              }
            } else {
              rows.push({
                order_id: order.id,
                product_id: it.product_id,
                product_name: it.product_name,
                product_image: it.product_id ? info?.image_url ?? null : null,
                unit_price: it.unit_price,
                quantity: it.quantity,
                roblox_name: it.roblox_name ?? null,
              });
            }
          }

          const { error: itemsErr } = await admin.from("order_items").insert(rows);
          if (itemsErr) throw itemsErr;

          // Mark reserved account stock as sold
          const allReservedIds = Object.values(reservations).flat().map((r) => r.id);
          if (allReservedIds.length) {
            await admin
              .from("product_account_stock")
              .update({
                status: "sold",
                sold_to: body.user_id,
                sold_at: new Date().toISOString(),
              })
              .in("id", allReservedIds);
          }

          if (body.pay_from_balance) {
            const { error: deductErr } = await admin.rpc("deduct_balance", {
              _user_id: body.user_id,
              _amount: total,
              _order_id: order.id,
            });
            if (deductErr) {
              // rollback
              await admin.from("orders").delete().eq("id", order.id);
              if (allReservedIds.length) {
                await admin
                  .from("product_account_stock")
                  .update({ status: "available", sold_to: null, sold_at: null })
                  .in("id", allReservedIds);
              }
              return Response.json(
                { error: deductErr.message || "insufficient" },
                { status: 400 },
              );
            }
          }

          return Response.json({
            id: order.id,
            receipt_code: order.receipt_code,
            ip,
          });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
