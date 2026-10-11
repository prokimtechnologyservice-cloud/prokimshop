// Server helper: resolve an opaque app session token to the owning user id.
// Used by the money-moving API routes so they never trust a user_id sent by the browser.
export async function sessionUserId(admin: any, token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token.length < 32) return null;
  const { data } = await admin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data?.user_id) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.user_id as string;
}

export const UNAUTHORIZED = () =>
  Response.json({ error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" }, { status: 401 });
