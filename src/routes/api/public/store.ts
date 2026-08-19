import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Item = {
  product_id?: string | null;
  product_name: string;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
};

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

function makeOrderNo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `S${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

const DELIVERY_STATUSES = ["none", "delivered", "waiting_stock", "no_contact", "failed"];

export const Route = createFileRoute("/api/public/store")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as any;
          const action = String(body?.action ?? "");
          const db = admin();

          const { data: st } = await db.from("store_settings").select("*").eq("id", true).maybeSingle();
          const settings = st as any;

          async function staffBy(code: string) {
            if (!code) return null;
            const { data } = await db
              .from("staff")
              .select("id, name, staff_code, role")
              .eq("staff_code", code)
              .maybeSingle();
            return (data as any) ?? null;
          }

          switch (action) {
            case "gate": {
              const code = String(body.code ?? "").trim();
              if (!settings) return bad("ยังไม่ได้ตั้งค่าหน้าร้าน", 500);
              if (!settings.store_open) return bad("หน้าร้านปิดอยู่");
              if (code !== String(settings.access_code)) return bad("รหัสผ่านไม่ถูกต้อง", 401);
              return Response.json({ ok: true, shift_label: settings.shift_label ?? null });
            }

            case "create": {
              const code = String(body.access_code ?? "").trim();
              if (!settings?.store_open) return bad("หน้าร้านปิดอยู่");
              if (code !== String(settings.access_code)) return bad("รหัสผ่านหมดอายุ กรุณาใส่รหัสใหม่", 401);
              const items = (body.items ?? []) as Item[];
              if (!Array.isArray(items) || items.length === 0) return bad("ไม่มีสินค้าในรายการ");
              const total = items.reduce(
                (s, i) => s + Number(i.unit_price || 0) * Number(i.quantity || 1),
                0,
              );
              const order_no = makeOrderNo();
              const { data: order, error } = await db
                .from("store_orders")
                .insert({
                  order_no,
                  customer_name: body.customer_name ? String(body.customer_name).slice(0, 80) : null,
                  note: body.note ? String(body.note).slice(0, 300) : null,
                  total,
                })
                .select("id, order_no, total, created_at")
                .single();
              if (error) throw error;
              const rows = items.map((i) => ({
                order_id: (order as any).id,
                product_id: i.product_id ?? null,
                product_name: String(i.product_name).slice(0, 200),
                image_url: i.image_url ?? null,
                unit_price: Number(i.unit_price || 0),
                quantity: Math.max(1, Number(i.quantity || 1)),
              }));
              const { error: ierr } = await db.from("store_order_items").insert(rows);
              if (ierr) throw ierr;
              return Response.json({ order });
            }

            case "status": {
              const nos = (body.order_nos ?? []) as string[];
              if (!Array.isArray(nos) || nos.length === 0) return Response.json({ orders: [] });
              const { data } = await db
                .from("store_orders")
                .select(
                  "id, order_no, customer_name, total, payment_status, delivery_status, delivery_note, created_at, store_order_items(id, product_name, image_url, unit_price, quantity)",
                )
                .in("order_no", nos.slice(0, 30))
                .order("created_at", { ascending: false });
              return Response.json({ orders: data ?? [] });
            }

            case "cancel": {
              const no = String(body.order_no ?? "");
              const { data: o } = await db
                .from("store_orders")
                .select("id, payment_status, created_at")
                .eq("order_no", no)
                .maybeSingle();
              if (!o) return bad("ไม่พบออเดอร์นี้", 404);
              if ((o as any).payment_status === "paid") return bad("ออเดอร์นี้ชำระเงินแล้ว ลบไม่ได้");
              const age = Date.now() - new Date((o as any).created_at).getTime();
              if (age < 20 * 60 * 1000) return bad("ลบได้หลังผ่านไป 20 นาที");
              const { error } = await db.from("store_orders").delete().eq("id", (o as any).id);
              if (error) throw error;
              return Response.json({ ok: true });
            }

            case "staff_list": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff) return bad("ไม่มีสิทธิ์", 403);
              const { data } = await db
                .from("store_orders")
                .select(
                  "id, order_no, customer_name, note, total, payment_status, paid_at, paid_by, delivery_status, delivery_note, delivered_at, delivered_by, created_at, store_order_items(id, product_name, image_url, unit_price, quantity)",
                )
                .order("created_at", { ascending: false })
                .limit(200);
              return Response.json({ orders: data ?? [] });
            }

            case "staff_pay": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff) return bad("ไม่มีสิทธิ์", 403);
              if (String(body.confirm_code ?? "") !== String(settings?.confirm_code))
                return bad("รหัสยืนยันไม่ถูกต้อง", 401);
              const { error } = await db
                .from("store_orders")
                .update({
                  payment_status: "paid",
                  paid_at: new Date().toISOString(),
                  paid_by: staff.name,
                })
                .eq("id", String(body.order_id));
              if (error) throw error;
              return Response.json({ ok: true });
            }

            case "staff_deliver": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff) return bad("ไม่มีสิทธิ์", 403);
              const status = String(body.delivery_status ?? "");
              if (!DELIVERY_STATUSES.includes(status)) return bad("สถานะไม่ถูกต้อง");
              const { data: o } = await db
                .from("store_orders")
                .select("payment_status")
                .eq("id", String(body.order_id))
                .maybeSingle();
              if (!o) return bad("ไม่พบออเดอร์", 404);
              if (status === "delivered" && (o as any).payment_status !== "paid")
                return bad("ต้องยืนยันการชำระเงินก่อนส่งสินค้า");
              const { error } = await db
                .from("store_orders")
                .update({
                  delivery_status: status,
                  delivery_note: body.delivery_note ? String(body.delivery_note).slice(0, 300) : null,
                  delivered_at: status === "delivered" ? new Date().toISOString() : null,
                  delivered_by: status === "delivered" ? staff.name : null,
                })
                .eq("id", String(body.order_id));
              if (error) throw error;
              return Response.json({ ok: true });
            }

            case "staff_delete": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff) return bad("ไม่มีสิทธิ์", 403);
              const { error } = await db.from("store_orders").delete().eq("id", String(body.order_id));
              if (error) throw error;
              return Response.json({ ok: true });
            }

            case "settings_get": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff || staff.role !== "manager") return bad("เฉพาะผู้จัดการ", 403);
              return Response.json({
                settings: {
                  access_code: settings?.access_code ?? "",
                  confirm_code: settings?.confirm_code ?? "",
                  store_open: settings?.store_open ?? true,
                  shift_label: settings?.shift_label ?? "",
                },
              });
            }

            case "settings_save": {
              const staff = await staffBy(String(body.staff_code ?? ""));
              if (!staff || staff.role !== "manager") return bad("เฉพาะผู้จัดการ", 403);
              const access_code = String(body.access_code ?? "").trim();
              const confirm_code = String(body.confirm_code ?? "").trim();
              if (access_code.length < 4 || confirm_code.length < 4)
                return bad("รหัสต้องมีอย่างน้อย 4 ตัวอักษร");
              const { error } = await db
                .from("store_settings")
                .update({
                  access_code,
                  confirm_code,
                  store_open: !!body.store_open,
                  shift_label: body.shift_label ? String(body.shift_label).slice(0, 60) : null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", true);
              if (error) throw error;
              return Response.json({ ok: true });
            }

            default:
              return bad("unknown action");
          }
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
