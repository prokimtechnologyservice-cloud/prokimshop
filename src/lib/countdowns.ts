import { supabase } from "@/integrations/supabase/client";

export type Countdown = {
  id: string;
  title: string;
  description: string | null;
  ends_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const table = () => (supabase as any).from("countdowns");

export async function listCountdowns(): Promise<Countdown[]> {
  const { data, error } = await table().select("*").order("ends_at", { ascending: true });
  if (error) throw error;
  return (data as Countdown[]) ?? [];
}

export async function createCountdown(input: {
  title: string;
  description: string | null;
  ends_at: string;
  active: boolean;
}) {
  const { error } = await table().insert(input);
  if (error) throw error;
}

export async function updateCountdown(
  id: string,
  input: Partial<Pick<Countdown, "title" | "description" | "ends_at" | "active">>
) {
  const { error } = await table()
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCountdown(id: string) {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

export function formatRemaining(endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return "สิ้นสุดแล้ว";
  const sec = Math.floor(diffMs / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} วัน`);
  parts.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
  return parts.join(" ");
}
