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
            client_token?: string | null;
            items: {
              product_id: string | null;
              product_name: string;
              unit_price: number;
              quantity: number;
              roblox_name?: string | null;
              farm_account_name?: string | null;
              farm_account_password?: string | null;
            }[];

            pay_from_balance: boolean;
            promotion_id?: string | null;
          };
          if (!body?.user_id || !Array.isArray(body.items) || body.items.length === 0) {
            return Response.json({ error: "invalid" }, { status: 400 });
          }
          const ip = getIp(request);
          const subtotal = body.items.reduce(
            (s, i) => s + Number(i.unit_price) * Number(i.quantity),
            0,
          );
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );

          // ---- Promotion / discount re-validation (server-side) ----
          let discountAmount = 0;
          let grantedRow: { id: string } | null = null;
          let appliedPromotion: any = null;
          if (body.promotion_id) {
            const { data: promo } = await admin
              .from("promotions")
              .select("*")
              .eq("id", body.promotion_id)
              .eq("active", true)
              .maybeSingle();
            if (promo) {
              const now = new Date();
              const inDateRange =
                (!promo.starts_at || new Date(promo.starts_at) <= now) &&
                (!promo.ends_at || new Date(promo.ends_at) >= now);
              let grantOk = promo.grant_rule === "all";
              let grantRow: any = null;
              if (!grantOk) {
                const { data: g } = await admin
                  .from("user_promotions")
                  .select("*")
                  .eq("promotion_id", promo.id)
                  .eq("user_id", body.user_id)
                  .is("used_at", null)
                  .maybeSingle();
                if (g && (!g.expires_at || new Date(g.expires_at) >= now)) {
                  grantOk = true;
                  grantRow = g;
                }
              } else {
                const { data: g } = await admin
                  .from("user_promotions")
                  .select("*")
                  .eq("promotion_id", promo.id)
                  .eq("user_id", body.user_id)
                  .is("used_at", null)
                  .maybeSingle();
                if (g && (!g.expires_at || new Date(g.expires_at) >= now)) grantRow = g;
              }
              if (inDateRange && grantOk) {
                // fetch categories for eligible items
                const itemProductIds = Array.from(
                  new Set(body.items.map((i) => i.product_id).filter(Boolean) as string[]),
                );
                const catMap = new Map<string, string | null>();
                if (itemProductIds.length) {
                  const { data: prodRows } = await admin
                    .from("products")
                    .select("id, category_id")
                    .in("id", itemProductIds);
                  (prodRows ?? []).forEach((p: any) => catMap.set(p.id, p.category_id ?? null));
                }
                const isAncestorMatch = async (catId: string | null, targets: string[]): Promise<boolean> => {
                  if (!catId) return false;
                  if (targets.includes(catId)) return true;
                  let current = catId;
                  for (let i = 0; i < 10; i++) {
                    const { data: c } = await admin
                      .from("categories")
                      .select("parent_id")
                      .eq("id", current)
                      .maybeSingle();
                    const parentId = c?.parent_id;
                    if (!parentId) break;
                    if (targets.includes(parentId)) return true;
                    current = parentId;
                  }
                  return false;
                };

                const eligibleItems: typeof body.items = [];
                for (const it of body.items) {
                  if (promo.applies_to === "all") {
                    eligibleItems.push(it);
                  } else if (promo.applies_to === "products") {
                    if (it.product_id && (promo.product_ids ?? []).includes(it.product_id)) eligibleItems.push(it);
                  } else if (promo.applies_to === "categories") {
                    const catId = it.product_id ? catMap.get(it.product_id) ?? null : null;
                    if (await isAncestorMatch(catId, promo.category_ids ?? [])) eligibleItems.push(it);
                  }
                }
                const eligibleSubtotal = eligibleItems.reduce(
                  (s, i) => s + Number(i.unit_price) * Number(i.quantity),
                  0,
                );
                const relevantSubtotal = promo.apply_on === "receipt" ? subtotal : eligibleSubtotal;
                const minOk = promo.min_subtotal == null || relevantSubtotal >= Number(promo.min_subtotal);
                const maxOk = promo.max_subtotal == null || relevantSubtotal <= Number(promo.max_subtotal);
                const hasEligible = eligibleItems.length > 0 || promo.applies_to === "all";

                if (minOk && maxOk && hasEligible) {
                  if (promo.discount_type === "amount") {
                    discountAmount = Math.min(Number(promo.discount_value ?? 0), eligibleSubtotal);
                  } else if (promo.discount_type === "percent") {
                    discountAmount = Math.min(
                      (eligibleSubtotal * Number(promo.discount_value ?? 0)) / 100,
                      eligibleSubtotal,
                    );
                  } else if (promo.discount_type === "bogo") {
                    const buyQty = Math.max(1, Number(promo.buy_qty ?? 1));
                    const getQty = Math.max(1, Number(promo.get_qty ?? 1));
                    const units: number[] = [];
                    eligibleItems.forEach((it) => {
                      for (let k = 0; k < it.quantity; k++) units.push(Number(it.unit_price));
                    });
                    const groups = Math.floor(units.length / (buyQty + getQty));
                    const freeCount = groups * getQty;
                    if (freeCount > 0) {
                      const sorted = [...units].sort((a, b) => a - b);
                      discountAmount = sorted.slice(0, freeCount).reduce((s, p) => s + p, 0);
                    }
                  }
                  if (discountAmount > 0) {
                    appliedPromotion = promo;
                    grantedRow = grantRow;
                  }
                }
              }
            }
          }
          discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
          const total = Math.max(0, subtotal - discountAmount);

          // Idempotency: same client_token must never create a second receipt
          const clientToken = body.client_token ? String(body.client_token) : null;
          if (clientToken) {
            const { data: dup } = await admin
              .from("orders")
              .select("id, receipt_code")
              .eq("client_token", clientToken)
              .maybeSingle();
            if (dup) {
              return Response.json({ id: dup.id, receipt_code: dup.receipt_code, ip, duplicate: true });
            }
          }


          // Preflight: check account (ไก่ตัน) stock availability
          const productIds = Array.from(
            new Set(body.items.map((i) => i.product_id).filter(Boolean) as string[]),
          );
          const prodMap = new Map<
            string,
            {
              image_url: string | null;
              product_type: string;
              stock: number | null;
              is_preorder: boolean;
              name: string;
            }
          >();
          if (productIds.length) {
            const { data: prods } = await admin
              .from("products")
              .select("id, name, image_url, product_type, stock, is_preorder")
              .in("id", productIds);
            (prods ?? []).forEach((p: any) =>
              prodMap.set(p.id, {
                image_url: p.image_url ?? null,
                product_type: p.product_type ?? "normal",
                stock: p.stock ?? null,
                is_preorder: !!p.is_preorder,
                name: p.name ?? "",
              }),
            );
          }

          // Preflight: normal-product stock check (pre-orders bypass stock)
          const needQty: Record<string, number> = {};
          for (const it of body.items) {
            if (!it.product_id) continue;
            const info = prodMap.get(it.product_id);
            if (!info || info.product_type !== "normal") continue;
            needQty[it.product_id] = (needQty[it.product_id] ?? 0) + Number(it.quantity);
          }
          for (const [pid, qty] of Object.entries(needQty)) {
            const info = prodMap.get(pid)!;
            if (info.is_preorder || info.stock == null) continue;
            if (info.stock < qty) {
              return Response.json(
                { error: `สินค้า "${info.name}" คงเหลือไม่พอ (เหลือ ${info.stock} ชิ้น)` },
                { status: 400 },
              );
            }
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
              client_token: clientToken,
            })
            .select("id, receipt_code")
            .single();
          if (error) {
            // Unique violation on client_token = a concurrent duplicate submit
            if (clientToken && (error as any).code === "23505") {
              const { data: dup } = await admin
                .from("orders")
                .select("id, receipt_code")
                .eq("client_token", clientToken)
                .maybeSingle();
              if (dup) {
                return Response.json({ id: dup.id, receipt_code: dup.receipt_code, ip, duplicate: true });
              }
            }
            throw error;
          }


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
                farm_account_name: it.farm_account_name ? String(it.farm_account_name).slice(0, 100) : null,
                farm_account_password: it.farm_account_password
                  ? String(it.farm_account_password).slice(0, 200)
                  : null,
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

          // Deduct tracked stock for normal (non-preorder) products
          for (const [pid, qty] of Object.entries(needQty)) {
            const info = prodMap.get(pid)!;
            if (info.is_preorder || info.stock == null) continue;
            await admin.rpc("adjust_product_stock", { _product_id: pid, _delta: -qty });
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
              for (const [pid, qty] of Object.entries(needQty)) {
                const info = prodMap.get(pid)!;
                if (info.is_preorder || info.stock == null) continue;
                await admin.rpc("adjust_product_stock", { _product_id: pid, _delta: qty });
              }
              return Response.json(
                { error: deductErr.message || "insufficient" },
                { status: 400 },
              );
            }
          }

          if (appliedPromotion && grantedRow) {
            await admin
              .from("user_promotions")
              .update({ used_at: new Date().toISOString(), order_id: order.id })
              .eq("id", grantedRow.id);
          }

          return Response.json({
            id: order.id,
            receipt_code: order.receipt_code,
            ip,
            discount: discountAmount,
            total,
          });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
