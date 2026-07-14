import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function getIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/public/spin-box")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            user_id: string;
            box_product_id: string;
            roblox_name?: string | null;
          };
          if (!body?.user_id || !body?.box_product_id) {
            return Response.json({ error: "invalid" }, { status: 400 });
          }
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );

          // 1) Load box product
          const { data: box, error: boxErr } = await admin
            .from("products")
            .select("id, name, box_spin_price, product_type, image_url")
            .eq("id", body.box_product_id)
            .maybeSingle();
          if (boxErr) throw boxErr;
          if (!box || box.product_type !== "mystery_box") {
            return Response.json({ error: "ไม่ใช่กล่องสุ่ม" }, { status: 400 });
          }
          const price = Number(box.box_spin_price) || 0;
          if (price <= 0) return Response.json({ error: "กล่องนี้ยังไม่ได้ตั้งราคา" }, { status: 400 });

          // 2) Check balance
          const { data: prof, error: pErr } = await admin
            .from("profiles")
            .select("balance")
            .eq("id", body.user_id)
            .maybeSingle();
          if (pErr) throw pErr;
          if (!prof) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
          if (Number(prof.balance) < price) {
            return Response.json({ error: "ยอดเงินไม่พอ" }, { status: 400 });
          }

          // 3) Get prizes with stock
          const { data: prizes, error: prizeErr } = await admin
            .from("mystery_box_items")
            .select(
              "id, prize_product_id, weight, stock, products:prize_product_id(id, name, image_url, product_type)",
            )
            .eq("box_product_id", body.box_product_id)
            .gt("stock", 0);
          if (prizeErr) throw prizeErr;
          const pool = (prizes ?? []) as any[];
          if (pool.length === 0) {
            return Response.json({ error: "กล่องนี้ของหมดแล้ว" }, { status: 400 });
          }

          // 4) Weighted random
          const totalW = pool.reduce((s, p) => s + Math.max(1, p.weight), 0);
          let r = Math.random() * totalW;
          let chosen = pool[0];
          for (const p of pool) {
            r -= Math.max(1, p.weight);
            if (r <= 0) {
              chosen = p;
              break;
            }
          }
          const prizeProduct = chosen.products;

          // 5) If prize is account type — reserve an account payload
          let deliveredPayload: string | null = null;
          let reservedAcctId: string | null = null;
          if (prizeProduct.product_type === "account") {
            const { data: acct } = await admin
              .from("product_account_stock")
              .select("id, payload")
              .eq("product_id", chosen.prize_product_id)
              .eq("status", "available")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (!acct) {
              return Response.json(
                { error: "รางวัลเป็นบัญชี แต่ในคลังไม่มีของแล้ว โปรดลองใหม่" },
                { status: 400 },
              );
            }
            deliveredPayload = (acct as any).payload;
            reservedAcctId = (acct as any).id;
          }

          // 6) Create order first (so we have order_id for deduct_balance)
          const { data: order, error: oErr } = await admin
            .from("orders")
            .insert({
              user_id: body.user_id,
              total: price,
              status: "pending",
              ip_address: getIp(request),
              paid_from_balance: true,
              payment_status: "paid",
            })
            .select("id, receipt_code")
            .single();
          if (oErr) throw oErr;

          const { error: iErr } = await admin.from("order_items").insert({
            order_id: order.id,
            product_id: chosen.prize_product_id,
            product_name: prizeProduct.name,
            product_image: prizeProduct.image_url ?? null,
            unit_price: price,
            quantity: 1,
            roblox_name: body.roblox_name ?? null,
            delivered_payload: deliveredPayload,
            mystery_box_id: box.id,
            mystery_box_name: box.name,
          });
          if (iErr) throw iErr;

          // 7) Deduct balance now with real order_id
          const { error: dErr } = await admin.rpc("deduct_balance", {
            _user_id: body.user_id,
            _amount: price,
            _order_id: order.id,
          } as any);
          if (dErr) {
            // rollback order + reservation
            await admin.from("orders").delete().eq("id", order.id);
            if (reservedAcctId) {
              await admin
                .from("product_account_stock")
                .update({ status: "available", sold_to: null, sold_at: null })
                .eq("id", reservedAcctId);
            }
            return Response.json({ error: dErr.message || "หักเงินไม่สำเร็จ" }, { status: 400 });
          }

          if (reservedAcctId) {
            await admin
              .from("product_account_stock")
              .update({
                status: "sold",
                sold_to: body.user_id,
                sold_at: new Date().toISOString(),
              })
              .eq("id", reservedAcctId);
          }

          // 8) Decrement prize stock
          await admin
            .from("mystery_box_items")
            .update({ stock: chosen.stock - 1 })
            .eq("id", chosen.id);

          // 9) Log spin
          await admin.from("mystery_box_spins").insert({
            user_id: body.user_id,
            box_product_id: box.id,
            prize_product_id: chosen.prize_product_id,
            order_id: order.id,
            spin_price: price,
          });

          const { data: freshProf } = await admin
            .from("profiles")
            .select("balance")
            .eq("id", body.user_id)
            .maybeSingle();

          return Response.json({
            prize: {
              id: prizeProduct.id,
              name: prizeProduct.name,
              image_url: prizeProduct.image_url,
              product_type: prizeProduct.product_type,
            },
            order_id: order.id,
            receipt_code: order.receipt_code,
            new_balance: Number(freshProf?.balance ?? 0),
            delivered_payload: deliveredPayload,
          });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
