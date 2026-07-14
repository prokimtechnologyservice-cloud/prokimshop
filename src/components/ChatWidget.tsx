import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  ensureUserThread,
  fetchMessages,
  markRead,
  sendMessage,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat";
import { useLocation } from "@tanstack/react-router";

export function ChatWidget() {
  const [user, setUserState] = useState(getUser());
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    const on = () => setUserState(getUser());
    window.addEventListener("auth-change", on);
    return () => window.removeEventListener("auth-change", on);
  }, []);

  // create/fetch thread when user logs in
  useEffect(() => {
    if (!user) {
      setThread(null);
      setMessages([]);
      setUnread(0);
      return;
    }
    let alive = true;
    (async () => {
      const t = await ensureUserThread(user.id);
      if (!alive) return;
      setThread(t);
      const m = await fetchMessages(t.id);
      if (!alive) return;
      setMessages(m);
      // compute unread admin→user
      const cnt = m.filter(
        (x) => x.sender === "admin" && x.created_at > t.last_user_read_at,
      ).length;
      setUnread(cnt);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // realtime subscribe to this thread's new messages
  useEffect(() => {
    if (!thread) return;
    const ch = supabase
      .channel(`chat-user-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender === "admin") {
            if (open) {
              markRead(thread.id, "user");
            } else {
              setUnread((u) => u + 1);
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [thread?.id, open]);

  // scroll to bottom on new messages
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && thread) {
      markRead(thread.id, "user");
      setUnread(0);
    }
  }, [open, thread?.id]);

  // hide on admin pages
  if (location.pathname.startsWith("/admin")) return null;
  if (!user) return null;

  async function submit() {
    if (!thread || !body.trim()) return;
    const b = body;
    setBody("");
    await sendMessage(thread.id, "user", b);
    // realtime will insert; but add optimistic fallback if same tab
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-gold text-onyx shadow-luxe flex items-center justify-center hover:scale-105 transition"
        aria-label="แชทกับแอดมิน"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center border-2 border-onyx">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-gradient-card">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="font-display text-lg text-gradient-gold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gold" /> ติดต่อแอดมิน
            </SheetTitle>
          </SheetHeader>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-10">
                ส่งข้อความหาแอดมินได้ทันที<br />ตอบกลับตามเวลาให้บริการ
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary/70 text-foreground border border-border rounded-bl-sm"
                  }`}
                >
                  {m.body}
                  <div className="text-[9px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3 flex gap-2">
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
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 resize-none bg-input border border-border rounded-lg px-3 py-2 text-sm max-h-32"
            />
            <Button variant="luxe" size="icon" onClick={submit} disabled={!body.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
