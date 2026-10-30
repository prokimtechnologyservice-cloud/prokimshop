// POST endpoint for the Roblox game server (e.g. the prokim_city map).
// Marks one or many pending top-up orders as delivered and stamps delivered_at.
// Requires the TOPUP_API_KEY secret via the `x-api-key` header.
// Body: { "order_id": "<uuid>" } or { "ids": ["<uuid>", ...] }
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function keyOk(provided: string, secret: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/topup/mark-order-delivered")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["TOPUP_API_KEY"];
        if (!secret) {
          return Response.json({ error: "TOPUP_API_KEY not configured" }, { status: 503 });
        }
        const provided = request.headers.get("x-api-key") ?? "";
        if (!provided || !keyOk(provided, secret)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid body" }, { status: 400 });
        }

        let ids: string[] = [];
        if (Array.isArray(body?.ids)) ids = body.ids;
        else if (typeof body?.order_id === "string") ids = [body.order_id];
        else if (typeof body?.id === "string") ids = [body.id];
        ids = ids.filter((x) => typeof x === "string" && UUID_RE.test(x));
        if (ids.length === 0) {
          return Response.json({ error: "missing order_id / ids" }, { status: 400 });
        }
        ids = Array.from(new Set(ids)).slice(0, 200);

        const db = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        // Only pending orders may flip to delivered; the game fetched them as
        // paid+pending so a manual/late call cannot resurrect closed orders.
        const { data, error } = await db
          .from("topup_orders")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .in("id", ids)
          .eq("status", "pending")
          .select("id");
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const updated = (data ?? []).map((r: any) => r.id);
        return Response.json(
          { updated, rejected: ids.filter((id) => !updated.includes(id)) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
