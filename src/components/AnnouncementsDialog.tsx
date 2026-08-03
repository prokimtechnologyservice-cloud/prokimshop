import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Megaphone, Pin } from "lucide-react";

type Ann = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  pinned?: boolean | null;
  image_url?: string | null;
};

export function AnnouncementsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [list, setList] = useState<Ann[]>([]);
  const [active, setActive] = useState<Ann | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const arr = ((data as Ann[]) ?? []).slice().sort((a, b) => {
          const pa = a.pinned ? 1 : 0;
          const pb = b.pinned ? 1 : 0;
          if (pa !== pb) return pb - pa;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
        setList(arr);
        setActive(arr[0] ?? null);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl p-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-gradient-card">
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gold" />

            ประกาศ
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] min-h-[320px] max-h-[60vh]">
          <aside className="border-r border-border bg-onyx/40 overflow-auto">
            {list.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">ยังไม่มีประกาศ</div>
            )}
            {list.map((a) => (
              <button
                key={a.id}
                onClick={() => setActive(a)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-border hover:bg-secondary/60 transition flex items-center justify-between gap-2 ${
                  active?.id === a.id ? "bg-secondary text-gold" : ""
                }`}
              >
                <span className="line-clamp-2">{a.title}</span>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
              </button>
            ))}
          </aside>

          <section className="p-6 overflow-auto">
            {active ? (
              <>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/15 border border-primary/40 text-xs text-gold mb-3">
                  ประกาศล่าสุด
                </div>
                <h3 className="font-display text-2xl mb-2">{active.title}</h3>
                <div className="text-xs text-muted-foreground mb-4">
                  {new Date(active.created_at).toLocaleString("th-TH")}
                </div>
                <p className="text-sm leading-7 whitespace-pre-wrap">{active.content}</p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">เลือกหัวข้อด้านซ้ายเพื่ออ่าน</div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
