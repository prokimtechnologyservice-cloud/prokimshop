// Lightweight client-side auth (per spec — own user/staff system, not Supabase Auth)
import { supabase } from "@/integrations/supabase/client";

export type UserSession = {
  id: string;
  username: string;
  roblox_name: string | null;
  balance: number;
};

export type StaffSession = {
  id: string;
  name: string;
  staff_code: string;
  role: "admin" | "manager";
};

const USER_KEY = "prokim_user";
const STAFF_KEY = "prokim_staff";
const STAFF_VERIFIED_KEY = "prokim_staff_verified";

// --- simple hash (not for real security; per spec) ---
async function hashPwd(pwd: string): Promise<string> {
  const enc = new TextEncoder().encode(pwd + "_prokim_salt");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ===== USER =====
export function getUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setUser(u: UserSession | null) {
  if (!u) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("auth-change"));
}

export async function signupUser(username: string, password: string, roblox_name: string) {
  setStaff(null);
  const password_hash = await hashPwd(password);
  const { data: existing } = await supabase
    .from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");

  const { data, error } = await supabase
    .from("profiles")
    .insert({ username, password_hash, roblox_name })
    .select("id, username, roblox_name, balance")
    .single();
  if (error) throw error;
  setUser({
    id: data.id,
    username: data.username,
    roblox_name: data.roblox_name,
    balance: Number(data.balance),
  });
  return data;
}

export async function loginUser(username: string, password: string) {
  setStaff(null);
  const password_hash = await hashPwd(password);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, roblox_name, balance, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.password_hash !== password_hash) throw new Error("ชื่อหรือรหัสไม่ถูกต้อง");
  setUser({
    id: data.id,
    username: data.username,
    roblox_name: data.roblox_name,
    balance: Number(data.balance),
  });
}

export async function refreshUser() {
  const u = getUser();
  if (!u) return;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, roblox_name, balance")
    .eq("id", u.id)
    .maybeSingle();
  if (data) setUser({ ...data, balance: Number(data.balance) });
}

// ===== STAFF =====
export function getStaff(): StaffSession | null {
  if (typeof window === "undefined") return null;
  localStorage.removeItem(STAFF_KEY);
  if (sessionStorage.getItem(STAFF_VERIFIED_KEY) !== "1") return null;
  const raw = sessionStorage.getItem(STAFF_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setStaff(s: StaffSession | null) {
  localStorage.removeItem(STAFF_KEY);
  if (!s) {
    sessionStorage.removeItem(STAFF_KEY);
    sessionStorage.removeItem(STAFF_VERIFIED_KEY);
  } else {
    sessionStorage.setItem(STAFF_KEY, JSON.stringify(s));
    sessionStorage.setItem(STAFF_VERIFIED_KEY, "1");
  }
  window.dispatchEvent(new Event("staff-change"));
}

// gate: ต้องป้อน Prokim / 36407 ก่อน แล้วจึงเข้าสู่ระบบจริง
export const STAFF_GATE_USERNAME = "Prokim";
export const STAFF_GATE_PASSWORD = "36407";

export async function loginStaff(name: string, staff_code: string, password: string) {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, staff_code, password, role")
    .eq("name", name)
    .eq("staff_code", staff_code)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.password !== password) throw new Error("ข้อมูลพนักงานไม่ถูกต้อง");
  setStaff({
    id: data.id,
    name: data.name,
    staff_code: data.staff_code,
    role: data.role as "admin" | "manager",
  });
}
