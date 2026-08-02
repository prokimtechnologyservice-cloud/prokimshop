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

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  product_type: string;
  auction_start_price: number;
  auction_step: number;
  auction_ends_at: string | null;
  auction_status: string;
  auction_winner_id: string | null;
  auction_final_price: number | null;
};

/** Settle one finished auction: charge the highest bidder that can still pay. */
async function settleAuction(db: ReturnType<typeof admin>, p: Product, ip: string) {
  const { data: bids } = await db
    .from("auction_bids")
    .select("id, user_id, amount, roblox_name, created_at")
    .eq("product_id", p.id)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true });

  const list = (bids as any[]) ?? [];
  for (const b of list) {
    const amount = Number(b.amount);
    const { data: order, error: oerr } = await db
      .from("orders")
      .insert({
        user_id: b.user_id,
        total: amount,
        status: "pending",
        ip_address: ip,
        paid_from_balance: true,
        payment_status: "paid",
        client_token: `auction:${p.id}`,
      })
      .select("id, receipt_code")
      .single();
    if (oerr || !order) continue;

    const { error: derr } = await db.rpc("deduct_balance", {
      _user_id: b.user_id,
      _amount: amount,
      _order_id: order.id,
    });
    if (derr) {
      // this bidder can no longer pay — try the next one
      await db.from("orders").delete().eq("id", order.id);
      continue;
    }

    await db.from("order_items").insert({
      order_id: order.id,
      product_id: p.id,
      product_name: `${p.name} (ประมูล)`,
      product_image: p.image_url,
      unit_price: amount,
      quantity: 1,
      roblox_name: b.roblox_name ?? null,
    });

    await db
      .from("products")
      .update({
        auction_status: "closed",
        auction_winner_id: b.user_id,
        auction_final_price: amount,
      })
      .eq("id", p.id);

    return { winner_id: b.user_id as string, amount, order_id: order.id };
  }

  await db.from("products").update({ auction_status: "closed" }).eq("id", p.id);
  return null;
}

export const Route = createFileRoute("/api/public/auction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            action: "bid" | "settle";
            product_id?: string;
            user_id?: string;
            amount?: number;
            roblox_name?: string | null;
          };
          const db = admin();
          const ip = getIp(request);

          if (body.action === "settle") {
            const { data: due } = await db
              .from("products")
              .select(
                "id, name, image_url, product_type, auction_start_price, auction_step, auction_ends_at, auction_status, auction_winner_id, auction_final_price",
              )
              .eq("product_type", "auction")
              .eq("auction_status", "open")
              .not("auction_ends_at", "is", null)
              .lte("auction_ends_at", new Date().toISOString());
            const results = [];
            for (const p of ((due as any[]) ?? []) as Product[]) {
              results.push({ product_id: p.id, result: await settleAuction(db, p, ip) });
            }
            return Response.json({ settled: results.length, results });
          }

          // ==== place a bid ====
          if (!body.product_id || !body.user_id || !body.amount) {
            return Response.json({ error: "invalid" }, { status: 400 });
          }
          const { data: prod } = await db
            .from("products")
            .select(
              "id, name, image_url, product_type, auction_start_price, auction_step, auction_ends_at, auction_status, auction_winner_id, auction_final_price",
            )
            .eq("id", body.product_id)
            .maybeSingle();
          const p = prod as Product | null;
          if (!p || p.product_type !== "auction") {
            return Response.json({ error: "ไม่พบสินค้าประมูล" }, { status: 400 });
          }
          if (p.auction_status !== "open") {
            return Response.json({ error: "การประมูลปิดแล้ว" }, { status: 400 });
          }
          if (p.auction_ends_at && new Date(p.auction_ends_at) <= new Date()) {
            await settleAuction(db, p, ip);
            return Response.json({ error: "หมดเวลาประมูลแล้ว" }, { status: 400 });
          }

          const { data: top } = await db
            .from("auction_bids")
            .select("amount")
            .eq("product_id", p.id)
            .order("amount", { ascending: false })
            .limit(1)
            .maybeSingle();
          const step = Number(p.auction_step) || 1;
          const current = top ? Number((top as any).amount) : null;
          const minNext = current == null ? Number(p.auction_start_price) : current + step;
          const amount = Number(body.amount);
          if (!(amount >= minNext)) {
            return Response.json(
              { error: `ต้องเสนอราคาอย่างน้อย ฿${minNext.toFixed(2)}` },
              { status: 400 },
            );
          }
          if (current != null && (amount - current) % step !== 0) {
            return Response.json(
              { error: `ต้องเพิ่มเป็นขั้นละ ฿${step.toFixed(2)}` },
              { status: 400 },
            );
          }

          const { data: profile } = await db
            .from("profiles")
            .select("balance")
            .eq("id", body.user_id)
            .maybeSingle();
          const balance = Number((profile as any)?.balance ?? 0);
          if (balance < amount) {
            return Response.json(
              { error: `ยอดเงินในเว็บไม่พอ (ต้องมีอย่างน้อย ฿${amount.toFixed(2)})` },
              { status: 400 },
            );
          }

          const { error: berr } = await db.from("auction_bids").insert({
            product_id: p.id,
            user_id: body.user_id,
            amount,
            roblox_name: body.roblox_name ?? null,
          });
          if (berr) throw berr;

          return Response.json({ ok: true, amount, next_min: amount + step });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
