import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllThreadsWithProfiles,
  fetchMessages,
  markRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, RefreshCw, User } from "lucide-react";

type ThreadRow = Awaited<ReturnType<typeof fetchAllThreadsWithProfiles>>[number];

export function ChatAdmin() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  async function loadThreads() {
    setLoading(true);
    const t = await fetchAllThreadsWithProfiles();
    setThreads(t);
    setLoading(false);
  }

  useEffect(() => {
    loadThreads();
    const ch = supabase
      .channel("admin-chat-index")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => loadThreads(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        () => loadThreads(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    fetchMessages(activeId).then((m) => {
      if (!alive) return;
      setMessages(m);
      markRead(activeId, "admin");
      loadThreads();
    });
    const ch = supabase
      .channel(`admin-chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${activeId}` },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender === "user") markRead(activeId, "admin");
        },
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [activeId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function submit() {
    if (!activeId || !body.trim()) return;
    const b = body;
    setBody("");
    await sendMessage(activeId, "admin", b);
  }

  const active = threads.find((t) => t.id === activeId);
  const totalUnread = threads.reduce((s, t) => s + (t.unread_admin ?? 0), 0);

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-gold" />
        <h3 className="font-display text-lg">แชทลูกค้า</h3>
        {totalUnread > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold">
            ยังไม่อ่าน {totalUnread}
          </span>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={loadThreads}>
          <RefreshCw className="w-3 h-3 mr-1" /> รีเฟรช
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 border border-border rounded-lg overflow-hidden bg-card">
        {/* Threads list */}
        <div className="border-r border-border max-h-[70vh] overflow-y-auto">
          {loading && <div className="p-4 text-xs text-muted-foreground">กำลังโหลด...</div>}
          {!loading && threads.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground">ยังไม่มีบทสนทนา</div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-secondary/40 transition ${
                activeId === t.id ? "bg-secondary/60" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {t.username ?? "—"}
                </span>
                {t.unread_admin > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold">
                    {t.unread_admin}
                  </span>
                )}
              </div>
              {t.roblox_name && (
                <div className="text-[10px] text-gold ml-5 truncate">{t.roblox_name}</div>
              )}
              {t.last_body && (
                <div className="text-[11px] text-muted-foreground ml-5 truncate mt-0.5">
                  {t.last_body}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground/60 ml-5">
                {new Date(t.updated_at).toLocaleString("th-TH")}
              </div>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex flex-col max-h-[70vh]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-8">
              เลือกบทสนทนาทางซ้าย
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-border">
                <div className="font-medium text-sm">{active.username ?? "—"}</div>
                {active.roblox_name && (
                  <div className="text-[11px] text-gold">Roblox: {active.roblox_name}</div>
                )}
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-onyx/30">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        m.sender === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary/70 text-foreground border border-border rounded-bl-sm"
                      }`}
                    >
                      {m.body}
                      <div className="text-[9px] opacity-60 mt-1">
                        {new Date(m.created_at).toLocaleString("th-TH")}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-10">
                    ยังไม่มีข้อความ
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="ตอบลูกค้า..."
                  className="flex-1 resize-none bg-input border border-border rounded-lg px-3 py-2 text-sm max-h-32"
                />
                <Button variant="luxe" size="icon" onClick={submit} disabled={!body.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
