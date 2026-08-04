import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Send, Paperclip, Loader2, MoreVertical, Megaphone, FileText, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import {
  ensureUserThread,
  fetchMessages,
  markRead,
  sendMessage,
  uploadChatFile,
  editMessage,
  deleteMessage,
  resetThread,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat";
import { useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

function AttachmentView({ m, onOpenImage }: { m: ChatMessage; onOpenImage: (url: string) => void }) {
  if (!m.attachment_url) return null;
  if (m.attachment_type === "image") {
    return (
      <img
        src={m.attachment_url}
        alt="แนบไฟล์"
        className="mt-1 max-h-48 rounded-lg cursor-pointer object-cover"
        onClick={() => onOpenImage(m.attachment_url!)}
      />
    );
  }
  if (m.attachment_type === "video") {
    return <video src={m.attachment_url} controls className="mt-1 max-h-48 rounded-lg" />;
  }
  if (m.attachment_type === "audio") {
    return <audio src={m.attachment_url} controls className="mt-1 w-full" />;
  }
  return (
    <a
      href={m.attachment_url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-1.5 text-xs underline break-all"
    >
      <FileText className="w-3.5 h-3.5 shrink-0" />
      {decodeURIComponent(m.attachment_url.split("/").pop() ?? "ไฟล์แนบ")}
    </a>
  );
}

export function ChatWidget() {
  const [user, setUserState] = useState(getUser());
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [unread, setUnread] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  // realtime subscribe to this thread's new/updated messages
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === msg.id ? msg : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
        (payload: any) => {
          setMessages((prev) => prev.filter((x) => x.id !== payload.old.id));
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
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !thread) return;
    setUploading(true);
    try {
      const att = await uploadChatFile(file);
      await sendMessage(thread.id, "user", "", att);
    } catch (err: any) {
      toast.error("อัปโหลดไฟล์ไม่สำเร็จ: " + (err?.message ?? "ไม่ทราบสาเหตุ"));
    } finally {
      setUploading(false);
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    await editMessage(editingId, editBody);
    setEditingId(null);
    setEditBody("");
  }

  async function onReset() {
    if (!thread) return;
    await resetThread(thread.id);
    setMessages([]);
    toast.success("รีเซ็ตแชทแล้ว");
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
          <SheetHeader className="px-4 pr-12 py-3 border-b border-border flex-row items-center justify-between space-y-0 gap-2">
            <SheetTitle className="font-display text-lg text-gradient-gold flex items-center gap-2 min-w-0 truncate">
              <MessageCircle className="w-4 h-4 text-gold shrink-0" /> <span className="truncate">ติดต่อแอดมิน</span>
            </SheetTitle>
            <div className="flex items-center gap-2 min-w-0 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground px-2 sm:px-3">
                  <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">รีเซ็ตแชท</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>รีเซ็ตแชท?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ข้อความทั้งหมดในแชทนี้จะถูกลบอย่างถาวร ไม่สามารถกู้คืนได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={onReset}>ยืนยันรีเซ็ต</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </SheetHeader>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-10">
                ส่งข้อความหาแอดมินได้ทันที<br />ตอบกลับตามเวลาให้บริการ
              </div>
            )}
            {messages.map((m) => {
              if (m.is_broadcast) {
                return (
                  <div key={m.id} className="w-full flex justify-center py-1">
                    <div className="max-w-[95%] w-full rounded-xl border border-gold bg-gold/10 px-3 py-2 text-sm text-center">
                      <div className="flex items-center justify-center gap-1.5 text-gold font-semibold text-xs mb-1">
                        <Megaphone className="w-3.5 h-3.5" /> ประกาศจากแอดมิน
                      </div>
                      {m.deleted ? (
                        <div className="italic text-muted-foreground">ข้อความถูกลบแล้ว</div>
                      ) : (
                        <>
                          {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                          <AttachmentView m={m} onOpenImage={setLightbox} />
                        </>
                      )}
                      <div className="text-[9px] opacity-60 mt-1">
                        {new Date(m.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              }
              const isMine = m.sender === "user";
              const isEditing = editingId === m.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                  <div className="max-w-[80%] flex items-start gap-1">
                    {isMine && !m.deleted && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition p-1 text-muted-foreground shrink-0 mt-1">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(m.id);
                              setEditBody(m.body);
                            }}
                          >
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMessage(m.id)}>
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary/70 text-foreground border border-border rounded-bl-sm"
                      }`}
                    >
                      {m.deleted ? (
                        <span className="italic text-muted-foreground">ข้อความถูกลบแล้ว</span>
                      ) : isEditing ? (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="bg-input border border-border rounded px-2 py-1 text-sm text-foreground resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingId(null)}>
                              ยกเลิก
                            </Button>
                            <Button size="sm" className="h-6 px-2 text-xs" onClick={saveEdit}>
                              บันทึก
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {m.body}
                          <AttachmentView m={m} onOpenImage={setLightbox} />
                        </>
                      )}
                      {!isEditing && (
                        <div className="text-[9px] opacity-60 mt-1">
                          {new Date(m.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          {m.edited_at && !m.deleted && <span> (แก้ไขแล้ว)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-3 flex gap-2 items-end">
            <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,*/*" className="hidden" onChange={onFileSelected} />
            <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
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

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightbox && <img src={lightbox} alt="แนบไฟล์" className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
