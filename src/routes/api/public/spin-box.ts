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

// Same maths as effectiveChances() in src/lib/mysteryBox.ts
function drawPrize(pool: any[]): any {
  const explicitTotal = pool.reduce(
    (s, p) => (p.chance != null ? s + Number(p.chance) : s),
    0,
  );
  const remainder = Math.max(0, 100 - explicitTotal);
  const weightPool = pool.filter((p) => p.chance == null);
  const totalWeight = weightPool.reduce((s, p) => s + Math.max(1, p.weight || 1), 0);

  const percents = pool.map((p) => {
    if (p.chance != null) return Number(p.chance);
    if (totalWeight <= 0) return 0;
    return (Math.max(1, p.weight || 1) / totalWeight) * remainder;
  });
  const totalPercent = percents.reduce((s, v) => s + v, 0) || 1;

  let r = Math.random() * totalPercent;
  for (let i = 0; i < pool.length; i++) {
    r -= percents[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
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
            .select("id, name, box_spin_price, product_type, image_url, box_stock")
            .eq("id", body.box_product_id)
            .maybeSingle();
          if (boxErr) throw boxErr;
          if (!box || box.product_type !== "mystery_box") {
            return Response.json({ error: "ไม่ใช่กล่องสุ่ม" }, { status: 400 });
          }
          if (box.box_stock != null && Number(box.box_stock) <= 0) {
            return Response.json({ error: "กล่องสุ่มนี้หมดแล้ว" }, { status: 400 });
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

          // 3) Get all prizes (incl. is_nothing slots), then filter out-of-stock non-nothing ones
          const { data: allPrizes, error: prizeErr } = await admin
            .from("mystery_box_items")
            .select(
              "id, prize_product_id, weight, stock, chance, is_nothing, label, image_url, products:prize_product_id(id, name, image_url, product_type, stock)",
            )
            .eq("box_product_id", body.box_product_id);
          if (prizeErr) throw prizeErr;
          const pool = ((allPrizes ?? []) as any[]).filter(
            (p) => p.is_nothing || Number(p.stock) > 0,
          );
          if (pool.length === 0) {
            return Response.json({ error: "กล่องนี้ของหมดแล้ว" }, { status: 400 });
          }

          // 4) Weighted / explicit-chance random draw
          const chosen = drawPrize(pool);
          const chosenIndex = (allPrizes as any[]).findIndex((p) => p.id === chosen.id);
          const isNothing = !!chosen.is_nothing;
          const prizeProduct = chosen.products ?? null;

          // "ไม่ได้ของ" — charge the spin, log it, no order item
          if (isNothing || !prizeProduct) {
            const { error: dErr } = await admin.rpc("deduct_balance", {
              _user_id: body.user_id,
              _amount: price,
              _order_id: null,
            } as any);
            if (dErr) {
              return Response.json({ error: dErr.message || "หักเงินไม่สำเร็จ" }, { status: 400 });
            }
            await admin
              .from("mystery_box_items")
              .update({ stock: Math.max(0, Number(chosen.stock) - 1) })
              .eq("id", chosen.id);
            if (box.box_stock != null) {
              await admin
                .from("products")
                .update({ box_stock: Math.max(0, Number(box.box_stock) - 1) })
                .eq("id", box.id);
            }
            await admin.from("mystery_box_spins").insert({
              user_id: body.user_id,
              box_product_id: box.id,
              prize_product_id: null,
              order_id: null,
              spin_price: price,
            });
            const { data: freshProf } = await admin
              .from("profiles")
              .select("balance")
              .eq("id", body.user_id)
              .maybeSingle();
            return Response.json({
              nothing: true,
              prize_index: chosenIndex,
              prize: { id: null, name: chosen.label ?? "ไม่ได้ของ", image_url: chosen.image_url ?? null, product_type: null },
              order_id: null,
              receipt_code: null,
              new_balance: Number(freshProf?.balance ?? 0),
              delivered_payload: null,
            });
          }

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

          // 8) Decrement prize stock (mystery_box_items) and underlying product stock/sold
          await admin
            .from("mystery_box_items")
            .update({ stock: Math.max(0, Number(chosen.stock) - 1) })
            .eq("id", chosen.id);

          if (prizeProduct.stock != null) {
            await admin.rpc("adjust_product_stock", {
              _product_id: chosen.prize_product_id,
              _delta: -1,
            } as any);
          }
          await admin.rpc("bump_sold_count", {
            _product_id: chosen.prize_product_id,
            _delta: 1,
          } as any);

          // 8b) Decrement box's own stock
          if (box.box_stock != null) {
            await admin
              .from("products")
              .update({ box_stock: Math.max(0, Number(box.box_stock) - 1) })
              .eq("id", box.id);
          }

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
            prize_index: chosenIndex,
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
