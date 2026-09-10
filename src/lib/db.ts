// Secure data gateway client.
//
// Sensitive tables are no longer reachable with the public browser key. All
// reads/writes go through /api/public/data, which verifies a server-side
// session token and forces ownership / staff checks before touching the DB.
//
// `userDb` and `staffDb` mimic the small slice of the supabase-js query
// builder the app actually uses, so call sites stay almost unchanged.

export const USER_TOKEN_KEY = "prokim_token";
export const STAFF_TOKEN_KEY = "prokim_staff_token";

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}
export function setUserToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(USER_TOKEN_KEY, t);
  else localStorage.removeItem(USER_TOKEN_KEY);
}
export function getStaffToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STAFF_TOKEN_KEY);
}
export function setStaffToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) sessionStorage.setItem(STAFF_TOKEN_KEY, t);
  else sessionStorage.removeItem(STAFF_TOKEN_KEY);
}

export type GatewayScope = "user" | "staff";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/public/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    return { data: null, error: { message: json?.error ?? `request failed (${res.status})` }, count: null };
  }
  return { data: json?.data ?? null, error: null, count: json?.count ?? null };
}

/** Call an unauthenticated/auth action on the gateway. */
export async function callAuth<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/public/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "request failed");
  return json?.data as T;
}

type Filter = [string, string, unknown];

class Query implements PromiseLike<{ data: any; error: any; count: number | null }> {
  private filters: Filter[] = [];
  private orderBy: [string, boolean][] = [];
  private columns = "*";
  private limitN: number | null = null;
  private singleMode: "one" | "maybe" | null = null;
  private countMode: string | null = null;
  private headOnly = false;
  private selectCalled = false;
  private payload: unknown = null;
  private onConflict: string | null = null;
  private ignoreDuplicates = false;

  constructor(
    private scope: GatewayScope,
    private table: string,
    private op: string,
  ) {}

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    this.columns = columns;
    this.selectCalled = true;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    if (this.op === "select") this.op = "select";
    return this;
  }
  insert(payload: unknown) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: unknown, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.payload = payload;
    this.onConflict = opts?.onConflict ?? null;
    this.ignoreDuplicates = !!opts?.ignoreDuplicates;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  private f(fn: string, col: string, val: unknown) {
    this.filters.push([fn, col, val]);
    return this;
  }
  eq(c: string, v: unknown) { return this.f("eq", c, v); }
  neq(c: string, v: unknown) { return this.f("neq", c, v); }
  gt(c: string, v: unknown) { return this.f("gt", c, v); }
  gte(c: string, v: unknown) { return this.f("gte", c, v); }
  lt(c: string, v: unknown) { return this.f("lt", c, v); }
  lte(c: string, v: unknown) { return this.f("lte", c, v); }
  like(c: string, v: unknown) { return this.f("like", c, v); }
  ilike(c: string, v: unknown) { return this.f("ilike", c, v); }
  is(c: string, v: unknown) { return this.f("is", c, v); }
  in(c: string, v: unknown) { return this.f("in", c, v); }
  contains(c: string, v: unknown) { return this.f("contains", c, v); }
  not(c: string, op: string, v: unknown) { return this.f(`not.${op}`, c, v); }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push([col, opts?.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "one";
    return this;
  }

  private run() {
    return post({
      scope: this.scope,
      token: this.scope === "staff" ? getStaffToken() : getUserToken(),
      table: this.table,
      op: this.op,
      columns: this.columns,
      filters: this.filters,
      order: this.orderBy,
      limitN: this.limitN,
      single: this.singleMode,
      count: this.countMode,
      head: this.headOnly,
      payload: this.payload,
      onConflict: this.onConflict,
      ignoreDuplicates: this.ignoreDuplicates,
      returning: this.selectCalled,
    });
  }

  then<A = { data: any; error: any; count: number | null }, B = never>(
    onfulfilled?: ((v: { data: any; error: any; count: number | null }) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: any) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

function makeDb(scope: GatewayScope) {
  return {
    from(table: string) {
      return new Query(scope, table, "select");
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      return post({
        scope,
        token: scope === "staff" ? getStaffToken() : getUserToken(),
        op: "rpc",
        fn,
        payload: args,
      });
    },
    /** Uploads a file through the server (bucket writes are staff/user gated). */
    async upload(path: string, file: File): Promise<{ url: string }> {
      const form = new FormData();
      form.set("scope", scope);
      form.set("token", (scope === "staff" ? getStaffToken() : getUserToken()) ?? "");
      form.set("path", path);
      form.set("file", file);
      const res = await fetch("/api/public/data", { method: "PUT", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "upload failed");
      return { url: json.url as string };
    },
    /**
     * Drop-in stand-in for `supabase.storage`. Uploads are proxied to the
     * server; the resulting public URL is remembered so the usual
     * `getPublicUrl(path)` call right after an upload keeps working.
     */
    /**
     * Realtime stand-in. The private tables have no browser grants, so
     * Postgres change streams are not available; we poll instead and invoke
     * the same callbacks the realtime API would have fired.
     */
    channel(_name: string) {
      const cbs: ((payload: unknown) => void)[] = [];
      const ch = {
        on(_event: string, _filter: unknown, cb: (payload: unknown) => void) {
          cbs.push(cb);
          return ch;
        },
        subscribe() {
          (ch as any)._timer = setInterval(() => cbs.forEach((cb) => cb({})), 5000);
          return ch;
        },
      };
      return ch as any;
    },
    removeChannel(ch: any) {
      if (ch?._timer) clearInterval(ch._timer);
    },
    storage: {

      from(_bucket: string) {
        return {
          async upload(path: string, file: File, _opts?: unknown) {
            try {
              const { url } = await makeDb(scope).upload(path, file);
              uploadedUrls.set(path, url);
              return { data: { path }, error: null as any };
            } catch (e: any) {
              return { data: null, error: { message: e?.message ?? "upload failed" } };
            }
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: uploadedUrls.get(path) ?? path } };
          },
        };
      },
    },
  };
}

const uploadedUrls = new Map<string, string>();


/** Acts as the signed-in customer; the server forces row ownership. */
export const userDb = makeDb("user");
/** Acts as signed-in staff; the server verifies the staff session. */
export const staffDb = makeDb("staff");

/**
 * Runs a server-side intent that needs more than a row filter (e.g. cancelling
 * an order item only while it is still unpaid and pending).
 */
export async function gatewayAction(
  scope: GatewayScope,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const res = await fetch("/api/public/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      op: "action",
      action,
      token: scope === "staff" ? getStaffToken() : getUserToken(),
      ...payload,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "request failed");
  return json?.data ?? null;
}

