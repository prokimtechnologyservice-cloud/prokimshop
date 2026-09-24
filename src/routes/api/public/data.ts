import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Authorized data gateway.
//
// Sensitive tables have no browser-key grants any more. Every read/write goes
// through here: we verify an opaque session token stored in public.app_sessions
// and then force ownership (customer scope) or a staff session (admin scope)
// before running the query with the service role.
// ---------------------------------------------------------------------------

function admin() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const SESSION_DAYS = 30;

function bad(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const hashPwd = (pwd: string) => sha256(pwd + "_prokim_salt");

function newToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

type Session = { user_id: string | null; staff_id: string | null; role: string | null };

async function loadSession(db: ReturnType<typeof admin>, token: unknown): Promise<Session | null> {
  if (typeof token !== "string" || token.length < 32) return null;
  const { data } = await db
    .from("app_sessions")
    .select("user_id, staff_id, role, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date((data as any).expires_at).getTime() < Date.now()) return null;
  return { user_id: (data as any).user_id, staff_id: (data as any).staff_id, role: (data as any).role };
}

// ===== scope rules =====

/** column that must equal the session user id */
const USER_OWNER: Record<string, string> = {
  cart_items: "user_id",
  orders: "user_id",
  wallet_transactions: "user_id",
  user_promotions: "user_id",
  mystery_box_spins: "user_id",
  chat_threads: "user_id",
  product_reviews: "user_id",
  profiles: "id",
};
/** tables owned through a parent row: [child fk, parent table, parent owner col] */
const USER_PARENT: Record<string, [string, string, string]> = {
  order_items: ["order_id", "orders", "user_id"],
  chat_messages: ["thread_id", "chat_threads", "user_id"],
};
/** ops the customer scope may run per table */
const USER_OPS: Record<string, string[]> = {
  cart_items: ["select", "insert", "update", "delete"],
  orders: ["select"],
  order_items: ["select", "update"],
  wallet_transactions: ["select"],
  user_promotions: ["select", "update"],
  mystery_box_spins: ["select"],
  chat_threads: ["select", "insert", "update"],
  chat_messages: ["select", "insert", "update"],
  product_reviews: ["select", "insert", "update", "upsert", "delete"],
  profiles: ["select", "update"],
};
/** columns the customer may write, when narrower than the whole row */
const USER_WRITABLE: Record<string, string[]> = {
  profiles: ["roblox_name"],
  order_items: ["return_status", "return_reason", "returned_at"],
  user_promotions: ["used_at", "order_id"],
};
/** never leaves the server */
const NEVER_SELECT: Record<string, string[]> = {
  profiles: ["password_hash"],
  staff: ["password"],
};

/** Explicit safe column lists used when a caller asks for "*" on these tables. */
const SAFE_STAR: Record<string, string> = {
  profiles: "id, username, roblox_name, balance, created_at, updated_at",
  staff: "id, name, staff_code, role, created_at",
};

const STAFF_TABLES = new Set([
  "announcements", "auction_bids", "cart_items", "categories", "category_views",
  "chat_messages", "chat_threads", "countdowns", "gift_cards", "mystery_box_items",
  "mystery_box_spins", "order_items", "orders", "product_account_stock",
  "product_reviews", "products", "profiles", "promotions", "site_content",
  "site_overlays", "site_popups", "site_settings", "staff", "user_promotions",
  "visits", "wallet_transactions",
]);

const USER_RPC = new Set(["redeem_gift_card"]);
const STAFF_RPC = new Set(["refund_to_user", "purge_old_stats", "adjust_product_stock", "bump_sold_count"]);

// ===== query execution =====

function stripCols(table: string, columns: string) {
  const banned = NEVER_SELECT[table];
  if (!banned) return columns;
  if (columns === "*") return SAFE_STAR[table] ?? columns;
  return columns
    .split(",")
    .map((c) => c.trim())
    .filter((c) => !banned.includes(c.split(":")[0].trim()))
    .join(", ");
}

function pick(payload: any, allowed: string[]) {
  const one = (row: any) => {
    const out: Record<string, unknown> = {};
    for (const k of allowed) if (k in row) out[k] = row[k];
    return out;
  };
  return Array.isArray(payload) ? payload.map(one) : one(payload);
}

function applyFilters(q: any, filters: unknown) {
  if (!Array.isArray(filters)) return q;
  for (const f of filters) {
    if (!Array.isArray(f) || f.length !== 3) continue;
    const [fn, col, val] = f as [string, string, any];
    if (typeof fn !== "string" || typeof col !== "string") continue;
    if (fn.startsWith("not.")) {
      q = q.not(col, fn.slice(4), val);
    } else if (typeof (q as any)[fn] === "function") {
      q = (q as any)[fn](col, val);
    }
  }
  return q;
}

async function runQuery(db: ReturnType<typeof admin>, body: any, scope: "user" | "staff", session: Session) {
  const table: string = body.table;
  let op: string = body.op ?? "select";
  if (typeof table !== "string") return bad("missing table");

  let extraFilters: [string, string, any][] = [];
  let payload = body.payload;

  if (scope === "user") {
    const uid = session.user_id;
    if (!uid) return bad("not signed in", 401);
    const allowed = USER_OPS[table];
    if (!allowed || !allowed.includes(op)) return bad("forbidden", 403);

    const ownerCol = USER_OWNER[table];
    const parent = USER_PARENT[table];

    if (ownerCol) {
      extraFilters.push(["eq", ownerCol, uid]);
      if (op === "insert" || op === "upsert") {
        const stamp = (r: any) => ({ ...r, [ownerCol]: uid });
        payload = Array.isArray(payload) ? payload.map(stamp) : stamp(payload ?? {});
      }
    } else if (parent) {
      const [fk, ptable, pcol] = parent;
      const { data: rows } = await db.from(ptable).select("id").eq(pcol, uid);
      const ids = (rows ?? []).map((r: any) => r.id);
      if (ids.length === 0) {
        if (op === "select") return ok({ data: body.single ? null : [], count: 0 });
        return bad("forbidden", 403);
      }
      extraFilters.push(["in", fk, ids]);
      if (op === "insert" || op === "upsert") {
        const list = Array.isArray(payload) ? payload : [payload ?? {}];
        if (list.some((r: any) => !ids.includes(r?.[fk]))) return bad("forbidden", 403);
      }
    } else {
      return bad("forbidden", 403);
    }

    const writable = USER_WRITABLE[table];
    if (writable && (op === "update" || op === "insert" || op === "upsert")) {
      const base = pick(payload, writable);
      payload =
        op === "update"
          ? base
          : Array.isArray(base)
            ? base
            : { ...base, ...(ownerCol ? { [ownerCol]: uid } : {}) };
    }
    if (table === "product_reviews" && (op === "insert" || op === "upsert" || op === "update")) {
      // customers never approve their own review
      const clean = (r: any) => {
        const { approved, ...rest } = r ?? {};
        return rest;
      };
      payload = Array.isArray(payload) ? payload.map(clean) : clean(payload);
    }
  } else {
    if (!session.staff_id) return bad("not staff", 401);
    if (!STAFF_TABLES.has(table)) return bad("forbidden", 403);
    if (table === "staff" && session.role !== "manager" && op !== "select") {
      return bad("ต้องเป็นผู้จัดการเท่านั้น", 403);
    }
    if (table === "profiles" && (op === "insert" || op === "delete")) return bad("forbidden", 403);
  }

  const columns = stripCols(table, typeof body.columns === "string" ? body.columns : "*");
  let q: any = db.from(table);

  if (op === "insert") q = q.insert(payload);
  else if (op === "upsert")
    q = q.upsert(payload, {
      ...(body.onConflict ? { onConflict: body.onConflict } : {}),
      ...(body.ignoreDuplicates ? { ignoreDuplicates: true } : {}),
    });
  else if (op === "update") q = q.update(payload);
  else if (op === "delete") q = q.delete();

  if (op === "select") {
    q = q.select(columns, body.count ? { count: body.count, head: !!body.head } : undefined);
  }

  q = applyFilters(q, body.filters);
  for (const f of extraFilters) q = (q as any)[f[0]](f[1], f[2]);

  if (op === "select") {
    if (Array.isArray(body.order)) {
      for (const o of body.order) {
        if (Array.isArray(o) && typeof o[0] === "string") q = q.order(o[0], { ascending: o[1] !== false });
      }
    }
    if (typeof body.limitN === "number") q = q.limit(body.limitN);
  } else if (body.returning === true) {
    q = q.select(columns);
  }

  if (body.single === "one") q = q.single();
  else if (body.single === "maybe") q = q.maybeSingle();

  const { data, error, count } = await q;
  if (error) return bad(error.message, 400);
  return ok({ data: data ?? null, count: count ?? null });
}

// ===== handlers =====

async function handlePost({ request }: { request: Request }) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return bad("invalid body");
  }
  const db = admin();

  // --- auth actions (no session required) ---
  if (typeof body.action === "string" && body.op !== "action") {
    const action: string = body.action;

    if (action === "signup" || action === "login") {
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      if (!username || !password) return bad("กรอกข้อมูลให้ครบ");
      const password_hash = await hashPwd(password);

      let profile: any;
      if (action === "signup") {
        const { data: existing } = await db
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();
        if (existing) return bad("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        const { data, error } = await db
          .from("profiles")
          .insert({ username, password_hash, roblox_name: body.roblox_name ?? null })
          .select("id, username, roblox_name, balance")
          .single();
        if (error) return bad(error.message);
        profile = data;
      } else {
        const { data } = await db
          .from("profiles")
          .select("id, username, roblox_name, balance, password_hash")
          .eq("username", username)
          .maybeSingle();
        if (!data || (data as any).password_hash !== password_hash) {
          return bad("ชื่อหรือรหัสไม่ถูกต้อง", 401);
        }
        const { password_hash: _drop, ...rest } = data as any;
        profile = rest;
      }

      const token = newToken();
      await db.from("app_sessions").insert({
        token,
        user_id: profile.id,
        expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
      });
      return ok({
        data: { token, user: { ...profile, balance: Number(profile.balance) } },
      });
    }

    if (action === "staff-login") {
      const { data } = await db
        .from("staff")
        .select("id, name, staff_code, password, role")
        .eq("name", String(body.name ?? ""))
        .eq("staff_code", String(body.staff_code ?? ""))
        .maybeSingle();
      if (!data || (data as any).password !== String(body.password ?? "")) {
        return bad("ข้อมูลพนักงานไม่ถูกต้อง", 401);
      }
      const token = newToken();
      await db.from("app_sessions").insert({
        token,
        staff_id: (data as any).id,
        role: (data as any).role,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
      return ok({
        data: {
          token,
          staff: {
            id: (data as any).id,
            name: (data as any).name,
            staff_code: (data as any).staff_code,
            role: (data as any).role,
          },
        },
      });
    }

    if (action === "logout") {
      if (typeof body.token === "string") await db.from("app_sessions").delete().eq("token", body.token);
      return ok({ data: true });
    }

    if (action === "me") {
      const session = await loadSession(db, body.token);
      if (!session?.user_id) return bad("session expired", 401);
      const { data } = await db
        .from("profiles")
        .select("id, username, roblox_name, balance")
        .eq("id", session.user_id)
        .maybeSingle();
      if (!data) return bad("session expired", 401);
      return ok({ data: { ...(data as any), balance: Number((data as any).balance) } });
    }

    if (action === "public-aggregates") {
      const [{ data: acct }, { data: sold }] = await Promise.all([
        db.from("product_account_stock").select("product_id").eq("status", "available"),
        db.from("order_items").select("product_id, quantity"),
      ]);
      const available: Record<string, number> = {};
      for (const r of (acct as any[]) ?? []) {
        if (r.product_id) available[r.product_id] = (available[r.product_id] ?? 0) + 1;
      }
      const sales: Record<string, number> = {};
      for (const r of (sold as any[]) ?? []) {
        if (r.product_id) sales[r.product_id] = (sales[r.product_id] ?? 0) + Number(r.quantity ?? 1);
      }
      return ok({ data: { available, sales } });
    }

    if (action === "public-stats") {
      const resetAt = typeof body.reset_at === "string" ? body.reset_at : null;
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let usersQ = db.from("profiles").select("id", { count: "exact", head: true });
      let topupQ = db.from("wallet_transactions").select("amount").eq("type", "topup");
      let soldQ = db.from("order_items").select("quantity");
      if (resetAt) {
        usersQ = usersQ.gte("created_at", resetAt);
        topupQ = topupQ.gte("created_at", resetAt);
        soldQ = soldQ.gte("created_at", resetAt);
      }
      const [{ data: visits }, { count: userCount }, { data: topups }, { data: items }] =
        await Promise.all([
          db.from("visits").select("session_key").gte("visited_at", fiveMinAgo),
          usersQ,
          topupQ,
          soldQ,
        ]);
      const online = new Set(((visits as any[]) ?? []).map((v) => v.session_key)).size;
      const topup = ((topups as any[]) ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);
      const sold = ((items as any[]) ?? []).reduce((a, b) => a + Number(b.quantity ?? 0), 0);
      return ok({ data: { online, users: userCount ?? 0, topup, sold } });
    }

    if (action === "staff-me") {
      const session = await loadSession(db, body.token);
      if (!session?.staff_id) return bad("session expired", 401);
      const { data } = await db
        .from("staff")
        .select("id, name, staff_code, role")
        .eq("id", session.staff_id)
        .maybeSingle();
      if (!data) return bad("session expired", 401);
      return ok({ data });
    }

    return bad("unknown action");
  }

  // --- scoped data access ---
  const scope = body.scope === "staff" ? "staff" : body.scope === "user" ? "user" : null;
  if (!scope) return bad("missing scope");
  const session = await loadSession(db, body.token);
  if (!session) return bad("session expired", 401);

  if (body.op === "action") {
    const action = String(body.action ?? "");

    if (action === "queue-ids") {
      const { data } = await db
        .from("order_items")
        .select("id")
        .eq("fulfillment_status", "pending")
        .order("created_at", { ascending: true })
        .limit(1000);
      return ok({ data: (data ?? []).map((r: any) => r.id) });
    }

    if (action === "cancel-item") {
      const itemId = String(body.item_id ?? "");
      const { data: item } = await db
        .from("order_items")
        .select("id, quantity, product_id, fulfillment_status, orders!inner(user_id, payment_status)")
        .eq("id", itemId)
        .maybeSingle();
      if (!item) return bad("ไม่พบรายการนี้", 404);
      const row: any = item;
      if (scope === "user") {
        if (row.orders?.user_id !== session.user_id) return bad("forbidden", 403);
        if (row.fulfillment_status !== "pending" || row.orders?.payment_status === "paid") {
          return bad("ยกเลิกได้เฉพาะรายการที่ยังไม่ชำระและแอดมินยังไม่รับ", 400);
        }
      } else if (!session.staff_id) {
        return bad("not staff", 401);
      }
      await db.from("order_items").update({ fulfillment_status: "cancelled" }).eq("id", itemId);
      if (row.product_id) {
        await db.rpc("adjust_product_stock" as any, { _product_id: row.product_id, _delta: row.quantity });
        await db.rpc("bump_sold_count" as any, { _product_id: row.product_id, _delta: -row.quantity });
      }
      return ok({ data: true });
    }

    return bad("unknown action");
  }

  if (body.op === "rpc") {

    const fn = String(body.fn ?? "");
    const allowed = scope === "staff" ? STAFF_RPC : USER_RPC;
    if (!allowed.has(fn)) return bad("forbidden", 403);
    if (scope === "staff" && !session.staff_id) return bad("not staff", 401);
    const args = { ...(body.payload ?? {}) };
    if (scope === "user") {
      if (!session.user_id) return bad("not signed in", 401);
      args["_user_id"] = session.user_id;
    }
    const { data, error } = await db.rpc(fn as any, args);
    if (error) return bad(error.message, 400);
    return ok({ data: data ?? null });
  }

  return runQuery(db, body, scope, session);
}

// file uploads (product images, chat attachments)
async function handlePut({ request }: { request: Request }) {
  const form = await request.formData();
  const scope = form.get("scope") === "staff" ? "staff" : "user";
  const db = admin();
  const session = await loadSession(db, form.get("token"));
  if (!session) return bad("session expired", 401);
  if (scope === "staff" && !session.staff_id) return bad("not staff", 401);
  if (scope === "user" && !session.user_id) return bad("not signed in", 401);

  const file = form.get("file");
  if (!(file instanceof File)) return bad("missing file");
  if (file.size > 20 * 1024 * 1024) return bad("ไฟล์ใหญ่เกิน 20MB");

  const raw = String(form.get("path") ?? "");
  const safe = raw.replace(/[^A-Za-z0-9._/-]/g, "_").replace(/\.{2,}/g, ".").replace(/^\/+/, "");
  const prefix = scope === "staff" ? "" : `chat/${session.user_id}/`;
  const path = prefix ? `${prefix}${safe.split("/").pop()}` : safe || `uploads/${crypto.randomUUID()}`;

  const { error } = await db.storage
    .from("product-images")
    .upload(path, file, { upsert: scope === "staff", contentType: file.type || undefined });
  if (error) return bad(error.message);
  const { data } = db.storage.from("product-images").getPublicUrl(path);
  return ok({ url: data.publicUrl });
}

export const Route = createFileRoute("/api/public/data")({
  server: { handlers: { POST: handlePost, PUT: handlePut } },
});
