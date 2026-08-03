import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const Route = createFileRoute("/api/public/order-maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as { action?: string };
          if (body.action !== "expire_unpaid") {
            return Response.json({ error: "unknown action" }, { status: 400 });
          }

          const db = admin();
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

          const { data: orders, error: oerr } = await (db as any)
            .from("orders")
            .select("id, user_id, payment_status, paid_from_balance, created_at")
            .eq("payment_status", "unpaid")
            .eq("paid_from_balance", false)
            .lt("created_at", cutoff);
          if (oerr) throw oerr;

          let expired = 0;
          for (const order of orders ?? []) {
            const { data: items, error: ierr } = await db
              .from("order_items")
              .select("id, product_id, product_name, unit_price, quantity, roblox_name")
              .eq("order_id", order.id);
            if (ierr) continue;

            for (const it of items ?? []) {
              if (it.product_id) {
                await (db as any).from("cart_items").insert({
                  user_id: order.user_id,
                  product_id: it.product_id,
                  product_name: it.product_name,
                  unit_price: it.unit_price,
                  quantity: it.quantity,
                  roblox_name: it.roblox_name ?? null,
                });
                await (db as any).rpc("adjust_product_stock", {
                  _product_id: it.product_id,
                  _delta: it.quantity,
                });
                await (db as any).rpc("bump_sold_count", {
                  _product_id: it.product_id,
                  _delta: -it.quantity,
                });
              }
            }

            await db.from("order_items").delete().eq("order_id", order.id);
            await db.from("orders").delete().eq("id", order.id);
            expired++;
          }

          return Response.json({ expired });
        } catch (e: any) {
          return Response.json({ error: e.message ?? "unexpected error" }, { status: 500 });
        }
      },
    },
  },
});
