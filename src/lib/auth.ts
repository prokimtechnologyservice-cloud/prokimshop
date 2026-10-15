// User / staff auth. Credentials are verified on the server; the browser only
// keeps an opaque session token that the data gateway validates on every call.
import {
  callAuth,
  getStaffToken,
  getUserToken,
  setStaffToken,
  setUserToken,
} from "@/lib/db";

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

// ===== USER =====
export function getUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  if (!getUserToken()) return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setUser(u: UserSession | null) {
  if (typeof window === "undefined") return;
  if (!u) {
    localStorage.removeItem(USER_KEY);
    setUserToken(null);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }
  window.dispatchEvent(new Event("auth-change"));
}

export async function signupUser(username: string, password: string, roblox_name: string) {
  setStaff(null);
  const { token, user } = await callAuth<{ token: string; user: UserSession }>("signup", {
    username,
    password,
    roblox_name,
  });
  setUserToken(token);
  setUser(user);
  return user;
}

export async function loginUser(username: string, password: string) {
  setStaff(null);
  const { token, user } = await callAuth<{ token: string; user: UserSession }>("login", {
    username,
    password,
  });
  setUserToken(token);
  setUser(user);
}

export async function refreshUser() {
  const token = getUserToken();
  if (!token) return;
  try {
    const me = await callAuth<UserSession>("me", { token });
    setUser(me);
  } catch (e: any) {
    // Only sign out when the server says the session is really gone;
    // a network blip or aborted request must not log the customer out.
    if (e?.status === 401 || e?.status === 403) setUser(null);
  }
}

export async function logoutUser() {
  const token = getUserToken();
  if (token) await callAuth("logout", { token }).catch(() => null);
  setUser(null);
}

// ===== STAFF =====
export function getStaff(): StaffSession | null {
  if (typeof window === "undefined") return null;
  localStorage.removeItem(STAFF_KEY);
  if (!getStaffToken()) return null;
  if (sessionStorage.getItem(STAFF_VERIFIED_KEY) !== "1") return null;
  const raw = sessionStorage.getItem(STAFF_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setStaff(s: StaffSession | null) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STAFF_KEY);
  if (!s) {
    sessionStorage.removeItem(STAFF_KEY);
    sessionStorage.removeItem(STAFF_VERIFIED_KEY);
    setStaffToken(null);
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
  const { token, staff } = await callAuth<{ token: string; staff: StaffSession }>("staff-login", {
    name,
    staff_code,
    password,
  });
  setStaffToken(token);
  setStaff(staff);
}

export async function logoutStaff() {
  const token = getStaffToken();
  if (token) await callAuth("logout", { token }).catch(() => null);
  setStaff(null);
}
