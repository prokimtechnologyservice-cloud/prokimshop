import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllThreadsWithProfiles,
  fetchMessages,
  markRead,
  sendMessage,
  uploadChatFile,
  editMessage,
  deleteMessage,
  resetThread,
  broadcastMessage,
  type ChatMessage,
  type AttachmentType,
} from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, RefreshCw, User, Paperclip, Loader2, MoreVertical, Megaphone, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type ThreadRow = Awaited<ReturnType<typeof fetchAllThreadsWithProfiles>>[number];

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
    <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-xs underline break-all">
      <FileText className="w-3.5 h-3.5 shrink-0" />
      {decodeURIComponent(m.attachment_url.split("/").pop() ?? "ไฟล์แนบ")}
    </a>
  );
}

export function ChatAdmin() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // broadcast dialog state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAtt, setBroadcastAtt] = useState<{ url: string; type: AttachmentType } | null>(null);
  const [broadcastUploading, setBroadcastUploading] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const broadcastFileRef = useRef<HTMLInputElement | null>(null);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => loadThreads())
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `thread_id=eq.${activeId}` },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === msg.id ? msg : x)));
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

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const att = await uploadChatFile(file);
      await sendMessage(activeId, "admin", "", att);
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

  async function onReset(threadId: string) {
    await resetThread(threadId);
    if (threadId === activeId) setMessages([]);
    toast.success("รีเซ็ตแชทแล้ว");
    loadThreads();
  }

  async function onBroadcastFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBroadcastUploading(true);
    try {
      const att = await uploadChatFile(file);
      setBroadcastAtt(att);
    } catch (err: any) {
      toast.error("อัปโหลดไฟล์ไม่สำเร็จ: " + (err?.message ?? "ไม่ทราบสาเหตุ"));
    } finally {
      setBroadcastUploading(false);
    }
  }

  async function sendBroadcast() {
    if (!broadcastBody.trim() && !broadcastAtt) return;
    setBroadcastSending(true);
    try {
      const count = await broadcastMessage(broadcastBody, broadcastAtt ?? undefined);
      toast.success(`ส่งประกาศถึง ${count} แชทเรียบร้อย`);
      setBroadcastOpen(false);
      setBroadcastBody("");
      setBroadcastAtt(null);
      loadThreads();
    } catch (err: any) {
      toast.error("ส่งประกาศไม่สำเร็จ: " + (err?.message ?? "ไม่ทราบสาเหตุ"));
    } finally {
      setBroadcastSending(false);
    }
  }

  const active = threads.find((t) => t.id === activeId);
  const totalUnread = threads.reduce((s, t) => s + (t.unread_admin ?? 0), 0);

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <MessageCircle className="w-5 h-5 text-gold" />
        <h3 className="font-display text-lg">แชทลูกค้า</h3>
        {totalUnread > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold">
            ยังไม่อ่าน {totalUnread}
          </span>
        )}
        <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="luxe" className="gap-1.5">
              <Megaphone className="w-3.5 h-3.5" /> ประกาศทั่วเว็บ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-gold" /> ประกาศทั่วเว็บ
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="พิมพ์ข้อความประกาศถึงลูกค้าทุกคน..."
                rows={4}
              />
              <div className="flex items-center gap-2">
                <input ref={broadcastFileRef} type="file" accept="image/*,video/*,audio/*,*/*" className="hidden" onChange={onBroadcastFile} />
                <Button variant="outline" size="sm" onClick={() => broadcastFileRef.current?.click()} disabled={broadcastUploading}>
                  {broadcastUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Paperclip className="w-3.5 h-3.5 mr-1" />}
                  แนบไฟล์
                </Button>
                {broadcastAtt && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">แนบไฟล์แล้ว ({broadcastAtt.type})</span>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBroadcastOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={sendBroadcast}
                disabled={broadcastSending || (!broadcastBody.trim() && !broadcastAtt)}
              >
                {broadcastSending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                ส่งประกาศ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{active.username ?? "—"}</div>
                  {active.roblox_name && (
                    <div className="text-[11px] text-gold">Roblox: {active.roblox_name}</div>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                      <RotateCcw className="w-3 h-3" /> รีเซ็ตแชท
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
                      <AlertDialogAction onClick={() => onReset(active.id)}>ยืนยันรีเซ็ต</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-onyx/30">
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
                          <div className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString("th-TH")}</div>
                        </div>
                      </div>
                    );
                  }
                  const isMine = m.sender === "admin";
                  const isEditing = editingId === m.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                      <div className="max-w-[75%] flex items-start gap-1">
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
                              {new Date(m.created_at).toLocaleString("th-TH")}
                              {m.edited_at && !m.deleted && <span> (แก้ไขแล้ว)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-10">
                    ยังไม่มีข้อความ
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-border flex gap-2 items-end">
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

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightbox && <img src={lightbox} alt="แนบไฟล์" className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
