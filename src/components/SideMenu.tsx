import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Megaphone, Package, MessageCircle, UserPlus, LogOut, History, Crown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUser, setUser, type UserSession } from "@/lib/auth";
import { ADMIN_CHAT_URL } from "@/lib/cart";
import { useNavigate } from "@tanstack/react-router";

type Announcement = { id: string; title: string; content: string; created_at: string };
type Category = { id: string; name: string };

export function SideMenu({
  open,
  onOpenChange,
  onOpenAuth,
  onSelectCategory,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenAuth: () => void;
  onSelectCategory?: (id: string) => void;
}) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [section, setSection] = useState<"home" | "ann">("home");
  const [anns, setAnns] = useState<Announcement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setUserState(getUser());
    const onAuth = () => setUserState(getUser());
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: a } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20);
      setAnns((a as Announcement[]) ?? []);
    })();
  }, [open]);

  function close() {
    onOpenChange(false);
    setSection("home");
  }

  function handleAuthBtn() {
    if (user) {
      setUser(null);
      close();
      navigate({ to: "/" });
    } else {
      close();
      onOpenAuth();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] sm:w-96 p-0 bg-gradient-card border-r border-border">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="font-display text-2xl text-gradient-gold flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> เมนู PROKIM
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-72px)]">
          {section === "home" && (
            <div className="p-3 space-y-1">
              <MenuRow icon={<Megaphone className="w-5 h-5 text-gold" />} label="หน้าร้าน / ประกาศ" onClick={() => setSection("ann")} />
              <MenuRow icon={<Package className="w-5 h-5 text-gold" />} label="สินค้า" onClick={() => { close(); onSelectCategory?.("__all__"); }} />
              <MenuRow
                icon={<MessageCircle className="w-5 h-5 text-gold" />}
                label="ติดต่อแอดมิน"
                onClick={() => { window.open(ADMIN_CHAT_URL, "_blank"); close(); }}
              />
              {user && (
                <MenuRow
                  icon={<History className="w-5 h-5 text-gold" />}
                  label="ประวัติการซื้อ"
                  onClick={() => { close(); navigate({ to: "/history" }); }}
                />
              )}
              <MenuRow
                icon={user ? <LogOut className="w-5 h-5 text-gold" /> : <UserPlus className="w-5 h-5 text-gold" />}
                label={user ? `ออกจากระบบ (${user.username})` : "สมัคร / เข้าสู่ระบบ"}
                onClick={handleAuthBtn}
              />
            </div>
          )}

          {section === "ann" && (
            <div className="p-3 space-y-2">
              <BackRow onClick={() => setSection("home")} />
              {anns.length === 0 && (
                <div className="text-center text-muted-foreground py-10 text-sm">ยังไม่มีประกาศ</div>
              )}
              {anns.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card/60 p-3">
                  <div className="font-medium text-gold text-sm mb-1">{a.title}</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{a.content}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-2">
                    {new Date(a.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary/60 border border-transparent hover:border-primary/30 transition text-left"
    >
      {icon}
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function BackRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-xs text-muted-foreground hover:text-gold px-3 py-2"
    >
      ← กลับ
    </button>
  );
}
