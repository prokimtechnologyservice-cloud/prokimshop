// GET endpoint for the Roblox game server (e.g. the prokim_city map).
// Returns orders that are pending and paid for the requested game place.
// Requires the TOPUP_API_KEY secret via the `x-api-key` header or `?key=`.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

function keyOk(provided: string, secret: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/topup/get-pending-orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["TOPUP_API_KEY"];
        if (!secret) {
          return Response.json({ error: "TOPUP_API_KEY not configured" }, { status: 503 });
        }
        const url = new URL(request.url);
        const provided = request.headers.get("x-api-key") ?? url.searchParams.get("key") ?? "";
        if (!provided || !keyOk(provided, secret)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const gamePlace =
          (url.searchParams.get("game_place") ?? "prokim_city").trim().slice(0, 80) || "prokim_city";
        const limit = Math.min(
          Math.max(Math.floor(Number(url.searchParams.get("limit") ?? 50)) || 50, 1),
          200,
        );
        const db = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await db
          .from("topup_orders")
          .select(
            "id, roblox_username, roblox_user_id, item_name, item_id, quantity, price, status, payment_status, game_place, created_at",
          )
          .eq("game_place", gamePlace)
          .eq("status", "pending")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: true })
          .limit(limit);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json(
          { orders: data ?? [] },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
