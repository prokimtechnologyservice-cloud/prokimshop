import { supabase } from "@/integrations/supabase/client";

export type AttachmentType = "image" | "video" | "audio" | "file";

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  edited_at: string | null;
  deleted: boolean;
  is_broadcast: boolean;
};

export type ChatThread = {
  id: string;
  user_id: string;
  updated_at: string;
  last_user_read_at: string;
  last_admin_read_at: string;
};

export async function ensureUserThread(userId: string): Promise<ChatThread> {
  const { data: existing } = await (supabase as any)
    .from("chat_threads")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as ChatThread;
  const { data, error } = await (supabase as any)
    .from("chat_threads")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatThread;
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await (supabase as any)
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data as ChatMessage[]) ?? [];
}

function detectAttachmentType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export async function uploadChatFile(
  file: File,
): Promise<{ url: string; type: AttachmentType }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `chat/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl, type: detectAttachmentType(file) };
}

export async function sendMessage(
  threadId: string,
  sender: "user" | "admin",
  body: string,
  attachment?: { url: string; type: AttachmentType },
) {
  const b = body.trim();
  if (!b && !attachment) return;
  await (supabase as any).from("chat_messages").insert({
    thread_id: threadId,
    sender,
    body: b,
    attachment_url: attachment?.url ?? null,
    attachment_type: attachment?.type ?? null,
  });
  await (supabase as any)
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function editMessage(id: string, body: string) {
  const b = body.trim();
  await (supabase as any)
    .from("chat_messages")
    .update({ body: b, edited_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteMessage(id: string) {
  await (supabase as any)
    .from("chat_messages")
    .update({ deleted: true, body: "" })
    .eq("id", id);
}

export async function resetThread(threadId: string) {
  await (supabase as any).from("chat_messages").delete().eq("thread_id", threadId);
}

export async function broadcastMessage(
  body: string,
  attachment?: { url: string; type: AttachmentType },
): Promise<number> {
  const b = body.trim();
  if (!b && !attachment) return 0;
  const { data: threads, error } = await (supabase as any).from("chat_threads").select("id");
  if (error) throw error;
  const list = (threads as { id: string }[]) ?? [];
  if (list.length === 0) return 0;
  const rows = list.map((t) => ({
    thread_id: t.id,
    sender: "admin" as const,
    body: b,
    attachment_url: attachment?.url ?? null,
    attachment_type: attachment?.type ?? null,
    is_broadcast: true,
  }));
  await (supabase as any).from("chat_messages").insert(rows);
  await Promise.all(
    list.map((t) =>
      (supabase as any)
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", t.id),
    ),
  );
  return list.length;
}

export async function markRead(threadId: string, side: "user" | "admin") {
  const field = side === "user" ? "last_user_read_at" : "last_admin_read_at";
  await (supabase as any)
    .from("chat_threads")
    .update({ [field]: new Date().toISOString() })
    .eq("id", threadId);
}

export async function fetchAllThreadsWithProfiles(): Promise<
  (ChatThread & { username: string | null; roblox_name: string | null; unread_admin: number; last_body: string | null })[]
> {
  const { data: threads } = await (supabase as any)
    .from("chat_threads")
    .select("*, profiles(username, roblox_name)")
    .order("updated_at", { ascending: false })
    .limit(200);
  const list = ((threads as any[]) ?? []).map((t) => ({
    ...t,
    username: t.profiles?.username ?? null,
    roblox_name: t.profiles?.roblox_name ?? null,
    unread_admin: 0,
    last_body: null,
  }));
  // fetch unread counts + last message per thread
  await Promise.all(
    list.map(async (t) => {
      const { count } = await (supabase as any)
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", t.id)
        .eq("sender", "user")
        .gt("created_at", t.last_admin_read_at);
      t.unread_admin = count ?? 0;
      const { data: last } = await (supabase as any)
        .from("chat_messages")
        .select("body")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      t.last_body = last?.body ?? null;
    }),
  );
  return list;
}
