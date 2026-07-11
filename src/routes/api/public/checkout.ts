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

          const { error: itemsErr } = await admin.from("order_items").insert(
            body.items.map((i) => ({
              order_id: order.id,
              product_id: i.product_id,
              product_name: i.product_name,
              unit_price: i.unit_price,
              quantity: i.quantity,
            })),
          );
          if (itemsErr) throw itemsErr;

          if (body.pay_from_balance) {
            const { error: deductErr } = await admin.rpc("deduct_balance", {
              _user_id: body.user_id,
              _amount: total,
              _order_id: order.id,
            });
            if (deductErr) {
              // rollback order on failed deduction
              await admin.from("orders").delete().eq("id", order.id);
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
